# Evolução OLX Monitor - Sistema Multi-Usuário com Comandos Telegram

O OLX Monitor atual usa URLs fixas em um arquivo de configuração e envia notificações unidirecionais para um único chat Telegram. Esta evolução permitirá que **cada usuário** interaja com o bot via comandos para **adicionar, visualizar e remover** seus próprios links de monitoramento.

## User Review Required

> [!IMPORTANT]
> **Breaking Change**: O sistema de URLs fixas em `config.js` será **removido**. Todas as URLs serão gerenciadas pelos usuários via comandos do bot.

> [!WARNING]
> **Dependência Nova**: Será adicionada a lib `node-telegram-bot-api` (~2MB) para escutar comandos do Telegram.

---

## Proposed Changes

### Database Layer

Novas tabelas para suportar usuários e seus links de monitoramento.

#### [MODIFY] [database.js](file:///c:/Users/games/olx-monitor/src/database/database.js)

Adicionar criação de 2 novas tabelas:

```sql
-- Tabela de usuários do Telegram
CREATE TABLE IF NOT EXISTS "users" (
    "id"            INTEGER PRIMARY KEY,  -- Telegram chat_id
    "username"      TEXT,
    "firstName"     TEXT,
    "lastName"      TEXT,
    "created"       TEXT NOT NULL
);

-- Links de monitoramento por usuário
CREATE TABLE IF NOT EXISTS "user_urls" (
    "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
    "userId"        INTEGER NOT NULL,
    "url"           TEXT NOT NULL,
    "label"         TEXT,        -- Nome amigável (ex: "Apto Madureira")
    "isActive"      INTEGER DEFAULT 1,
    "created"       TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
);
```

Também modificar tabela `ads` para incluir `userId`:

```sql
ALTER TABLE ads ADD COLUMN userId INTEGER;
```

---

#### [NEW] [userRepository.js](file:///c:/Users/games/olx-monitor/src/repositories/userRepository.js)

CRUD para usuários:
- `createUser(user)` - Cria usuário a partir de dados do Telegram
- `getUser(id)` - Busca usuário por chat_id
- `getAllUsers()` - Lista todos usuários
- `userExists(id)` - Verifica se usuário existe

---

#### [NEW] [userUrlRepository.js](file:///c:/Users/games/olx-monitor/src/repositories/userUrlRepository.js)

CRUD para links de usuários:
- `createUserUrl(userId, url, label)` - Adiciona novo link
- `getUserUrls(userId)` - Lista links de um usuário
- `getUserUrl(id)` - Busca link específico
- `getAllActiveUrls()` - Todas URLs ativas de todos usuários (para scraper)
- `deleteUserUrl(id, userId)` - Remove link (verificando ownership)
- `urlExistsForUser(userId, url)` - Evita duplicatas

---

### Validação e Sanitização de URLs

#### [NEW] [urlValidator.js](file:///c:/Users/games/olx-monitor/src/utils/urlValidator.js)

Funções de validação:
- `isValidOlxUrl(url)` - Verifica se é URL válida do OLX Brasil
- `sanitizeUrl(url)` - Remove parâmetros tracking, normaliza URL
- `verifyUrlAccessible(url)` - Faz HEAD request para verificar se é acessível

Regras de validação:
1. Deve começar com `https://www.olx.com.br/` ou `https://olx.com.br/`
2. Não pode ser URL de anúncio individual (precisa ser busca/listagem)
3. URL deve retornar status 2xx
4. Sanitiza removendo parâmetros UTM e outros de tracking

---

### Telegram Bot (Comandos)

#### [NEW] [TelegramBot.js](file:///c:/Users/games/olx-monitor/src/components/TelegramBot.js)

Gerenciador de comandos do bot usando `node-telegram-bot-api`:

| Comando | Descrição |
|---------|-----------|
| `/start` | Boas-vindas e registro do usuário |
| `/adicionar <url>` | Adiciona novo link de monitoramento |
| `/listar` | Lista todos os links do usuário |
| `/remover <id>` | Remove um link pelo ID |
| `/ajuda` | Mostra comandos disponíveis |

**Todas as mensagens em português brasileiro:**
- Boas-vindas: "🎉 Olá! Sou o OLX Monitor Bot..."
- Sucesso ao adicionar: "✅ Link adicionado com sucesso! ID: X"
- Erro de URL inválida: "❌ URL inválida. Use uma URL de busca do OLX."
- Lista vazia: "📭 Você ainda não tem links cadastrados."
- Novo anúncio: "🆕 Novo anúncio encontrado!\n..."
- Queda de preço: "📉 Preço baixou X%!\n..."

**Fluxo do /adicionar**:
1. Valida formato da URL
2. Sanitiza URL
3. Verifica se é acessível
4. Verifica se usuário já não tem esta URL
5. Salva no banco
6. Responde com confirmação

---

#### [MODIFY] [Notifier.js](file:///c:/Users/games/olx-monitor/src/components/Notifier.js)

Modificar para aceitar `chatId` como parâmetro opcional:

```javascript
// Antes
exports.sendNotification = async (msg) => { ... }

// Depois
exports.sendNotification = async (msg, chatId = config.telegramChatID) => { ... }
```

---

### Scraper Layer

#### [MODIFY] [Scraper.js](file:///c:/Users/games/olx-monitor/src/components/Scraper.js)

Modificar função `scraper()` para aceitar objetos com userId:

```javascript
// Antes
const scraper = async (url) => { ... }

// Depois  
const scraper = async (urlInfo) => {
    // urlInfo = { url, userId, chatId } ou string simples para fallback
    const url = typeof urlInfo === 'string' ? urlInfo : urlInfo.url;
    const userId = typeof urlInfo === 'object' ? urlInfo.userId : null;
    const chatId = typeof urlInfo === 'object' ? urlInfo.chatId : null;
    ...
}
```

Passar `userId` e `chatId` para a classe Ad.

---

#### [MODIFY] [Ad.js](file:///c:/Users/games/olx-monitor/src/components/Ad.js)

- Adicionar propriedades `userId` e `chatId` ao constructor
- Modificar `addToDataBase()` para salvar `userId`
- Modificar chamadas do `notifier.sendNotification()` para passar `chatId`

---

### Entry Point

#### [MODIFY] [index.js](file:///c:/Users/games/olx-monitor/src/index.js)

```javascript
// Adicionar imports
const { initializeTelegramBot } = require("./components/TelegramBot")
const userUrlRepository = require("./repositories/userUrlRepository")

// Modificar runScraper - APENAS URLs de usuários
const runScraper = async () => {
    const userUrls = await userUrlRepository.getAllActiveUrls();
    
    if (userUrls.length === 0) {
        $logger.info('Nenhuma URL para monitorar. Adicione URLs via bot.');
        return;
    }
    
    for (const urlInfo of userUrls) {
        try {
            await scraper({
                url: urlInfo.url,
                userId: urlInfo.userId,
                chatId: urlInfo.userId
            });
        } catch (error) {
            $logger.error(error);
        }
    }
}

// Inicializar bot junto com o resto
const main = async () => {
    $logger.info("Program started")
    await createTables()
    await initializeCycleTLS()
    initializeTelegramBot()  // Novo!
    runScraper()
}
```

---

### Package.json

#### [MODIFY] [package.json](file:///c:/Users/games/olx-monitor/src/package.json)

Adicionar dependência:

```json
"node-telegram-bot-api": "^0.66.0"
```

---

## Verification Plan

### Manual Verification

Como não há testes automatizados existentes e a funcionalidade é altamente dependente do Telegram/scraping em tempo real, a verificação será manual:

#### Teste 1: Inicialização do Bot
1. Execute `npm run dev` no diretório `src/`
2. Verifique no log: "Telegram bot initialized" (ou similar)
3. Verifique que não há erros de conexão

#### Teste 2: Comando /start
1. No Telegram, envie `/start` para o bot
2. **Esperado**: Mensagem de boas-vindas + criação do usuário no banco
3. Verifique no banco: `SELECT * FROM users;` deve mostrar seu chat_id

#### Teste 3: Comando /add com URL válida
1. Envie `/add https://www.olx.com.br/imoveis/estado-rj/rio-de-janeiro-e-regiao?q=apartamento`
2. **Esperado**: Mensagem de sucesso com ID do link
3. Verifique no banco: `SELECT * FROM user_urls;`

#### Teste 4: Comando /add com URL inválida
1. Envie `/add https://google.com`
2. **Esperado**: Mensagem de erro informando que não é URL do OLX

#### Teste 5: Comando /list
1. Envie `/list`
2. **Esperado**: Lista dos links adicionados com IDs

#### Teste 6: Comando /remove
1. Envie `/remove 1` (onde 1 é o ID do link)
2. **Esperado**: Confirmação de remoção
3. Envie `/list` para confirmar que foi removido

#### Teste 7: Notificações individuais
1. Adicione uma URL de busca com poucos resultados
2. Aguarde o próximo ciclo do cron (ou reinicie a app)
3. **Esperado**: Notificações apenas para você (não afeta outros usuários)

---

## Estrutura Final de Arquivos

```
src/
├── components/
│   ├── Ad.js           [MODIFY]
│   ├── CycleTls.js
│   ├── HttpClient.js
│   ├── Logger.js
│   ├── Notifier.js     [MODIFY]
│   ├── Scraper.js      [MODIFY]
│   └── TelegramBot.js  [NEW]
├── database/
│   └── database.js     [MODIFY]
├── repositories/
│   ├── adRepository.js
│   ├── scrapperRepository.js
│   ├── userRepository.js      [NEW]
│   └── userUrlRepository.js   [NEW]
├── utils/
│   └── urlValidator.js        [NEW]
├── index.js            [MODIFY]
└── package.json        [MODIFY]
```
