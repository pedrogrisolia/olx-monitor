const cheerio = require('cheerio')
const $logger = require('./Logger')
const $httpClient = require('./HttpClient.js')
const scraperRepository = require('../repositories/scrapperRepository.js')
const notifier = require("./Notifier");

const Ad = require("./Ad.js");

const MAX_ADS_PER_SEARCH = 500;

let page = 1;
let maxPrice = 0;
let minPrice = 99999999;
let sumPrices = 0;
let validAds = 0;
let adsFound = 0;
let nextPage = true;
let maxAdsLimit = MAX_ADS_PER_SEARCH;
let totalOfAds = null;

const scraper = async (urlInfo) => {
  page = 1;
  maxPrice = 0;
  minPrice = 99999999;
  sumPrices = 0;
  adsFound = 0;
  validAds = 0;
  nextPage = true;
  maxAdsLimit = MAX_ADS_PER_SEARCH;
  totalOfAds = null;

  // Suporta tanto string simples quanto objeto
  const url = typeof urlInfo === "string" ? urlInfo : urlInfo.url;
  const userId = typeof urlInfo === "object" ? urlInfo.userId : null;
  const chatId = typeof urlInfo === "object" ? urlInfo.chatId : null;

  const parsedUrl = new URL(url);
  const searchTerm = parsedUrl.searchParams.get("q") || "";
  const notify = await urlAlreadySearched(url);
  if (!notify) {
    $logger.info(`First run for URL ${url} - notifications disabled`);
  } else {
    $logger.info(`URL ${url} already processed - notifications enabled`);
  }

  do {
    currentUrl = setUrlParam(url, "o", page);
    let response;
    try {
      response = await $httpClient(currentUrl);
      const $ = cheerio.load(response);

      // Extrair totalOfAds apenas na primeira iteração
      if (page === 1) {
        const totalAds = extractTotalOfAds($);
        if (totalAds) {
          totalOfAds = totalAds;
          // Usa MAX_ADS_PER_SEARCH se totalOfAds for maior que o limite
          maxAdsLimit = totalAds > MAX_ADS_PER_SEARCH ? MAX_ADS_PER_SEARCH : totalAds;
          $logger.info(`Total ads found: ${totalOfAds}, using limit: ${maxAdsLimit}`);

          // Notificar se for primeira execução e houver totalOfAds
          if (!notify && totalOfAds) {
            const msg = `🔍 Foram encontrados ${totalOfAds} anúncios para essa busca.\n\nVocê será notificado sempre que aparecer novos anúncios ou algum anúncio cair de preço.`;
            try {
              await notifier.sendNotification(msg, chatId);
            } catch (error) {
              $logger.error("Could not send initial notification: " + error);
            }
          }
        }
      }

      nextPage = await scrapePage($, searchTerm, notify, url, userId, chatId);

      // Para se atingiu o limite de anúncios válidos
      if (validAds >= maxAdsLimit) {
        $logger.info(`Limit of ${maxAdsLimit} valid ads reached. Stopping search.`);
        nextPage = false;
      }
    } catch (error) {
      $logger.error(error);
      return;
    }
    page++;
  } while (nextPage);

  $logger.info("Valid ads: " + validAds);

  if (validAds) {
    const averagePrice = sumPrices / validAds;

    $logger.info("Maximum price: " + maxPrice);
    $logger.info("Minimum price: " + minPrice);
    $logger.info("Average price: " + sumPrices / validAds);

    const scrapperLog = {
      url,
      adsFound: validAds,
      averagePrice,
      minPrice,
      maxPrice,
    };

    await scraperRepository.saveLog(scrapperLog);
  }
};

const scrapePage = async ($, searchTerm, notify, url, userId = null, chatId = null) => {
  try {
    const script = $('script[id="__NEXT_DATA__"]').text();

    if (!script) {
      return false;
    }

    const adList = JSON.parse(script).props.pageProps.ads;

    if (!Array.isArray(adList) || !adList.length) {
      return false;
    }

    adsFound += adList.length;

    $logger.info(`Checking new ads for: ${searchTerm}`);
    $logger.info("Ads found: " + adsFound);

    for (let i = 0; i < adList.length; i++) {
      // Para se atingiu o limite de anúncios válidos
      if (validAds >= maxAdsLimit) {
        break;
      }

      $logger.debug("Checking ad: " + (i + 1));

      const advert = adList[i];
      const title = advert.subject;
      const id = advert.listId;
      const adUrl = advert.url;
      const price = parseInt(advert.price?.replace("R$ ", "")?.replace(".", "") || "0");

      const result = {
        id,
        url: adUrl,
        title,
        searchTerm,
        price,
        notify,
        userId,
        chatId,
      };

      const ad = new Ad(result);
      ad.process();

      if (ad.valid) {
        validAds++;
        minPrice = checkMinPrice(ad.price, minPrice);
        maxPrice = checkMaxPrice(ad.price, maxPrice);
        sumPrices += ad.price;
      }
    }

    return true;
  } catch (error) {
    $logger.error(error);
    throw new Error("Scraping failed");
  }
};

const urlAlreadySearched = async (url) => {
  try {
    const ad = await scraperRepository.getLogsByUrl(url, 1);
    if (ad.length) {
      return true;
    }
    $logger.info("First run, no notifications");
    return false;
  } catch (error) {
    $logger.error(error);
    return false;
  }
};

const setUrlParam = (url, param, value) => {
  const newUrl = new URL(url);
  let searchParams = newUrl.searchParams;
  searchParams.set(param, value);
  newUrl.search = searchParams.toString();
  return newUrl.toString();
};

const checkMinPrice = (price, minPrice) => {
  if (price < minPrice) return price;
  else return minPrice;
};

const checkMaxPrice = (price, maxPrice) => {
  if (price > maxPrice) return price;
  else return maxPrice;
};

const extractTotalOfAds = ($) => {
  try {
    const dataLayerScript = $('script[id="datalayer"]').text();
    if (!dataLayerScript) {
      return null;
    }

    // Extrair o JSON do dataLayer
    // O script contém: window.dataLayer = window.dataLayer || []; dataLayer.push({...})
    // Precisamos extrair o objeto dentro do push()
    const pushIndex = dataLayerScript.indexOf("dataLayer.push(");
    if (pushIndex === -1) {
      return null;
    }

    // Encontrar o início do objeto JSON (primeira chave após push()
    const startIndex = dataLayerScript.indexOf("{", pushIndex);
    if (startIndex === -1) {
      return null;
    }

    // Encontrar o final do objeto JSON contando chaves abertas/fechadas
    let braceCount = 0;
    let endIndex = startIndex;
    for (let i = startIndex; i < dataLayerScript.length; i++) {
      if (dataLayerScript[i] === "{") braceCount++;
      if (dataLayerScript[i] === "}") braceCount--;
      if (braceCount === 0) {
        endIndex = i + 1;
        break;
      }
    }

    if (braceCount !== 0) {
      return null;
    }

    const jsonString = dataLayerScript.substring(startIndex, endIndex);
    const dataLayerData = JSON.parse(jsonString);
    const totalOfAds = dataLayerData?.page?.detail?.totalOfAds;

    return totalOfAds ? parseInt(totalOfAds) : null;
  } catch (error) {
    $logger.debug("Could not extract totalOfAds from datalayer: " + error.message);
    return null;
  }
};

module.exports = {
    scraper
}
