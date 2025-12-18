const config = require("./config")
const cron = require("node-cron")
const { initializeCycleTLS } = require("./components/CycleTls")
const $logger = require("./components/Logger")
const { scraper } = require("./components/Scraper")
const { createTables } = require("./database/database.js")
const { initializeTelegramBot } = require("./components/TelegramBot");
const userUrlRepository = require("./repositories/userUrlRepository");

const runScraper = async () => {
  const userUrls = await userUrlRepository.getAllActiveUrls();

  if (userUrls.length === 0) {
    $logger.info("Nenhuma URL para monitorar. Adicione URLs via bot.");
    return;
  }

  for (const urlInfo of userUrls) {
    try {
      await scraper({
        url: urlInfo.url,
        userId: urlInfo.userId,
        chatId: urlInfo.chatId,
      });
    } catch (error) {
      $logger.error(error);
    }
  }
};

const main = async () => {
  $logger.info("Program started");
  await createTables();
  await initializeCycleTLS();
  initializeTelegramBot();
  runScraper();
};

main()

cron.schedule(config.interval, () => {
  runScraper()
})
