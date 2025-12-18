const axios = require('axios')
const $logger = require('../components/Logger.js')

const isValidOlxUrl = (url) => {
    try {
        const urlObj = new URL(url)
        
        // Deve ser HTTPS
        if (urlObj.protocol !== 'https:') {
            return false
        }

        // Deve ser domínio do OLX Brasil
        const hostname = urlObj.hostname.toLowerCase()
        if (hostname !== 'www.olx.com.br' && hostname !== 'olx.com.br') {
            return false
        }

        // Não pode ser URL de anúncio individual (deve ser busca/listagem)
        // URLs de anúncio geralmente têm formato: /imoveis/.../.../.../.../.../...
        // URLs de busca têm menos níveis ou parâmetros de busca
        const pathParts = urlObj.pathname.split('/').filter(p => p)
        
        // Se tiver muitos níveis, provavelmente é anúncio individual
        // URLs de busca geralmente têm até 3-4 níveis: /imoveis/estado-rj/rio-de-janeiro-e-regiao
        if (pathParts.length > 5) {
            return false
        }

        return true
    } catch (error) {
        return false
    }
}

const sanitizeUrl = (url) => {
    try {
        const urlObj = new URL(url)
        
        // Remove parâmetros de tracking
        const paramsToRemove = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'ref', 'source', 'campaign'
        ]
        
        paramsToRemove.forEach(param => {
            urlObj.searchParams.delete(param)
        })

        return urlObj.toString()
    } catch (error) {
        $logger.error('Error sanitizing URL: ' + error.message)
        return url
    }
}

const verifyUrlAccessible = async (url) => {
    try {
        const response = await axios.head(url, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status) => status >= 200 && status < 400
        })
        return true
    } catch (error) {
        $logger.error('URL not accessible: ' + error.message)
        return false
    }
}

module.exports = {
    isValidOlxUrl,
    sanitizeUrl,
    verifyUrlAccessible
}
