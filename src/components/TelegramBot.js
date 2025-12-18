const TelegramBot = require('node-telegram-bot-api')
const config = require('../config')
const $logger = require('./Logger')
const userRepository = require('../repositories/userRepository')
const userUrlRepository = require('../repositories/userUrlRepository')
const { isValidOlxUrl, sanitizeUrl, verifyUrlAccessible } = require('../utils/urlValidator')

let bot = null

const initializeTelegramBot = () => {
    if (!config.telegramToken) {
        $logger.warn('Telegram token not configured. Bot will not be initialized.')
        return
    }

    try {
        bot = new TelegramBot(config.telegramToken, { polling: true })
        $logger.info('Telegram bot initialized')

        // Comando /start
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id
            const user = {
                id: chatId,
                username: msg.chat.username || null,
                firstName: msg.chat.first_name || null,
                lastName: msg.chat.last_name || null
            }

            try {
                const exists = await userRepository.userExists(chatId)
                if (!exists) {
                    await userRepository.createUser(user)
                    $logger.info(`New user registered: ${chatId}`)
                }

                const welcomeMsg = '🎉 Olá! Sou o OLX Monitor Bot.\n\n' +
                    'Use os seguintes comandos para gerenciar seus links de monitoramento:\n\n' +
                    '/adicionar <url> - Adiciona um novo link para monitorar\n' +
                    '/listar - Lista todos os seus links cadastrados\n' +
                    '/remover <id> - Remove um link pelo ID\n' +
                    '/ajuda - Mostra esta mensagem de ajuda'

                bot.sendMessage(chatId, welcomeMsg)
            } catch (error) {
                $logger.error('Error in /start command: ' + error.message)
                bot.sendMessage(chatId, '❌ Erro ao processar comando. Tente novamente.')
            }
        })

        // Comando /adicionar ou /add
        bot.onText(/^\/(adicionar|add)\s+(.+)$/, async (msg, match) => {
            const chatId = msg.chat.id
            const url = match[2]

            if (!url) {
                bot.sendMessage(chatId, '❌ Por favor, forneça uma URL.\nExemplo: /adicionar https://www.olx.com.br/imoveis/...')
                return
            }

            try {
                // Verifica se usuário existe
                const userExists = await userRepository.userExists(chatId)
                if (!userExists) {
                    bot.sendMessage(chatId, '❌ Por favor, use /start primeiro para se registrar.')
                    return
                }

                // Valida formato da URL
                if (!isValidOlxUrl(url)) {
                    bot.sendMessage(chatId, '❌ URL inválida. Use uma URL de busca do OLX.\n' +
                        'Exemplo: https://www.olx.com.br/imoveis/estado-rj/rio-de-janeiro-e-regiao')
                    return
                }

                // Sanitiza URL
                const sanitizedUrl = sanitizeUrl(url)

                // Verifica se é acessível
                const isAccessible = await verifyUrlAccessible(sanitizedUrl)
                if (!isAccessible) {
                    bot.sendMessage(chatId, '❌ URL não acessível. Verifique se a URL está correta.')
                    return
                }

                // Verifica se usuário já tem esta URL
                const alreadyExists = await userUrlRepository.urlExistsForUser(chatId, sanitizedUrl)
                if (alreadyExists) {
                    bot.sendMessage(chatId, '❌ Você já possui este link cadastrado.')
                    return
                }

                // Salva no banco
                const urlId = await userUrlRepository.createUserUrl(chatId, sanitizedUrl)
                $logger.info(`User ${chatId} added URL: ${sanitizedUrl}`)

                bot.sendMessage(chatId, `✅ Link adicionado com sucesso! ID: ${urlId}`)
            } catch (error) {
                $logger.error('Error in /adicionar command: ' + error.message)
                bot.sendMessage(chatId, '❌ Erro ao adicionar link. Tente novamente.')
            }
        })

        // Comando /listar ou /list
        bot.onText(/\/listar|\/list/, async (msg) => {
            const chatId = msg.chat.id

            try {
                const urls = await userUrlRepository.getUserUrls(chatId)

                if (urls.length === 0) {
                    bot.sendMessage(chatId, '📭 Você ainda não tem links cadastrados.\n\nUse /adicionar <url> para adicionar um.')
                    return
                }

                let message = '📋 Seus links cadastrados:\n\n'
                urls.forEach(url => {
                    const status = url.isActive ? '✅' : '❌'
                    message += `${status} ID: ${url.id}\n`
                    if (url.label) {
                        message += `   Label: ${url.label}\n`
                    }
                    message += `   URL: ${url.url}\n\n`
                })

                bot.sendMessage(chatId, message)
            } catch (error) {
                $logger.error('Error in /listar command: ' + error.message)
                bot.sendMessage(chatId, '❌ Erro ao listar links. Tente novamente.')
            }
        })

        // Comando /remover ou /remove
        bot.onText(/^\/(remover|remove)\s+(\d+)$/, async (msg, match) => {
            const chatId = msg.chat.id
            const urlId = parseInt(match[2])

            if (!urlId) {
                bot.sendMessage(chatId, '❌ Por favor, forneça o ID do link.\nExemplo: /remover 1')
                return
            }

            try {
                await userUrlRepository.deleteUserUrl(urlId, chatId)
                $logger.info(`User ${chatId} removed URL ID: ${urlId}`)
                bot.sendMessage(chatId, `✅ Link removido com sucesso!`)
            } catch (error) {
                $logger.error('Error in /remover command: ' + error.message)
                bot.sendMessage(chatId, '❌ Erro ao remover link. Verifique se o ID está correto e se você possui este link.')
            }
        })

        // Comando /ajuda ou /help
        bot.onText(/\/ajuda|\/help/, async (msg) => {
            const chatId = msg.chat.id
            const helpMsg = '📖 Comandos disponíveis:\n\n' +
                '/start - Inicia o bot e registra seu usuário\n' +
                '/adicionar <url> - Adiciona um novo link para monitorar\n' +
                '/listar - Lista todos os seus links cadastrados\n' +
                '/remover <id> - Remove um link pelo ID\n' +
                '/ajuda - Mostra esta mensagem de ajuda'

            bot.sendMessage(chatId, helpMsg)
        })

        // Tratamento de erros
        bot.on('polling_error', (error) => {
            $logger.error('Telegram bot polling error: ' + error.message)
        })

    } catch (error) {
        $logger.error('Error initializing Telegram bot: ' + error.message)
    }
}

module.exports = {
    initializeTelegramBot
}
