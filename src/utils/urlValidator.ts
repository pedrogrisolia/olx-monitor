import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const $logger = require('../components/Logger');

/**
 * Verifica se uma URL é uma URL válida de busca do OLX Brasil
 * @param url - URL a ser validada
 * @returns true se for uma URL válida de busca do OLX
 */
export const isValidOlxUrl = (url: string): boolean => {
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

        const pathParts = urlObj.pathname.split('/').filter(p => p)

        // Precisa ter pelo menos um segmento de rota (evita aceitar homepage como busca)
        if (pathParts.length === 0) {
            return false
        }

        // Evita rotas conhecidas de página de detalhe de anúncio
        if (pathParts[0].toLowerCase() === 'd') {
            return false
        }

        // Heurística para detalhe de anúncio: último segmento contendo ID numérico
        // Exemplos comuns: /.../123456789 ou /.../titulo-do-anuncio-123456789
        const lastSegment = pathParts[pathParts.length - 1]
        if (/^\d{6,}$/.test(lastSegment) || /-\d{6,}$/.test(lastSegment)) {
            return false
        }

        return true
    } catch (error) {
        return false
    }
}

/**
 * Remove parâmetros de tracking de uma URL
 * @param url - URL a ser sanitizada
 * @returns URL sem parâmetros de tracking
 */
export const sanitizeUrl = (url: string): string => {
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
        const errorMessage = error instanceof Error ? error.message : String(error)
        $logger.error('Error sanitizing URL: ' + errorMessage)
        return url
    }
}

/**
 * Verifica se uma URL está acessível
 * @param url - URL a ser verificada
 * @returns Promise<boolean> - true se a URL estiver acessível
 */
export const verifyUrlAccessible = async (url: string): Promise<boolean> => {
    try {
        await axios.head(url, {
            timeout: 10000,
            maxRedirects: 5,
            validateStatus: (status: number) => status >= 200 && status < 400
        })
        return true
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        $logger.error('URL not accessible: ' + errorMessage)
        return false
    }
}

// Mantém compatibilidade com require() CommonJS
module.exports = {
    isValidOlxUrl,
    sanitizeUrl,
    verifyUrlAccessible
}
