# OLX Monitor - Documentação para Agentes de IA

## Visão Geral

O **OLX Monitor** é um sistema automatizado de monitoramento de anúncios do OLX (versão brasileira) que utiliza web scraping para detectar novos anúncios e alterações de preços, enviando notificações através do Telegram.

### Objetivo Principal
Monitorar continuamente buscas específicas no OLX e notificar o usuário sobre:
- Novos anúncios que correspondem aos critérios de busca
- Reduções de preço em anúncios já monitorados

### Tecnologias Principais
- **Node.js** - Runtime JavaScript
- **SQLite3** - Banco de dados para armazenar anúncios e logs
- **Cheerio** - Parser HTML/XML para extração de dados
- **CycleTLS** - Cliente HTTP avançado para evitar detecção de bots
- **node-cron** - Agendamento de tarefas recorrentes
- **Telegram Bot API** - Envio de notificações

---

## Arquitetura do Sistema

### Estrutura de Diretórios

```
olx-monitor/
├── src/
│   ├── components/          # Componentes principais do sistema
│   │   ├── Ad.js            # Classe para processar anúncios individuais
│   │   ├── CycleTls.js       # Gerenciador do CycleTLS
│   │   ├── HttpClient.js     # Cliente HTTP com fingerprinting
│   │   ├── Logger.js         # Sistema de logging
│   │   ├── Notifier.js       # Envio de notificações Telegram
│   │   └── Scraper.js        # Lógica principal de scraping
│   ├── database/
│   │   └── database.js       # Configuração e criação de tabelas SQLite
│   ├── repositories/         # Camada de acesso a dados
│   │   ├── adRepository.js   # Operações CRUD de anúncios
│   │   └── scrapperRepository.js  # Logs de execução do scraper
│   ├── config.js             # Configuração principal
│   ├── index.js              # Ponto de entrada da aplicação
│   ├── requestsFingerprints.js  # Fingerprints para evitar detecção
│   ├── .env                  # Variáveis de ambiente (Telegram)
│   └── package.json          # Dependências e scripts
├── data/                     # Dados gerados (criado em runtime)
│   ├── ads.db               # Banco de dados SQLite
│   └── scrapper.log         # Arquivo de logs
├── docker-compose.yml        # Configuração Docker
├── Dockerfile               # Imagem Docker
└── readme.md               # Documentação do usuário
```

### Fluxo de Execução

```
1. Inicialização (index.js)
   ├── Carrega configurações (config.js)
   ├── Inicializa logger
   ├── Cria tabelas no banco (se não existirem)
   ├── Inicializa CycleTLS
   └── Executa primeira varredura

2. Agendamento (node-cron)
   └── Executa runScraper() no intervalo configurado

3. Processamento de URL (Scraper.js)
   ├── Verifica se URL já foi pesquisada anteriormente
   ├── Para cada página de resultados:
   │   ├── Faz requisição HTTP com fingerprinting
   │   ├── Extrai dados JSON do script __NEXT_DATA__
   │   ├── Para cada anúncio encontrado:
   │   │   ├── Cria instância de Ad
   │   │   ├── Valida anúncio
   │   │   ├── Verifica se já existe no banco
   │   │   ├── Se novo: salva e notifica (se não for primeira execução)
   │   │   └── Se existente: verifica mudança de preço
   │   └── Continua para próxima página se houver
   └── Salva estatísticas da varredura (logs)

4. Notificação (Notifier.js)
   └── Envia mensagem via Telegram Bot API
```

---

## Componentes Principais

### 1. index.js
**Responsabilidade**: Ponto de entrada e orquestração principal

**Funcionalidades**:
- Inicializa todos os componentes necessários
- Agenda execuções periódicas usando node-cron
- Gerencia o ciclo de vida da aplicação

**Dependências**:
- `config.js` - Configurações
- `database/database.js` - Criação de tabelas
- `components/CycleTls.js` - Inicialização do cliente HTTP
- `components/Scraper.js` - Lógica de scraping

**Fluxo**:
```javascript
main() → createTables() → initializeCycleTLS() → runScraper()
cron.schedule() → runScraper() (periodicamente)
```

---

### 2. Scraper.js
**Responsabilidade**: Lógica principal de scraping e extração de dados

**Funcionalidades**:
- Faz requisições HTTP para páginas de busca do OLX
- Extrai anúncios do JSON embutido na página (`__NEXT_DATA__`)
- Processa paginação automaticamente
- Calcula estatísticas (preço mínimo, máximo, médio)
- Determina se deve notificar (primeira execução não notifica)

**Funções Principais**:

- `scraper(url)`: Função principal que processa uma URL de busca
 - Reseta variáveis de estado
 - Verifica se URL já foi pesquisada
 - Extrai `totalOfAds` do script `#datalayer` na primeira iteração (página 1)
 - Usa `totalOfAds` como limite se disponível, senão usa `MAX_ADS_PER_SEARCH` (500)
 - Notifica usuário na primeira execução se houver `totalOfAds` disponível
 - Loop através de páginas até não haver mais resultados ou atingir limite
 - Salva estatísticas finais

- `scrapePage($, searchTerm, notify, url)`: Processa uma página individual
 - Extrai script `__NEXT_DATA__` usando Cheerio
 - Parse do JSON para obter lista de anúncios
 - Processa cada anúncio através da classe Ad
 - Respeita limite de `maxAdsLimit` (pode ser `totalOfAds` ou `MAX_ADS_PER_SEARCH`)
 - Retorna `true` se há mais páginas, `false` caso contrário

- `extractTotalOfAds($)`: Extrai total de anúncios do dataLayer
 - Busca script `#datalayer` na página
 - Extrai objeto JSON do `dataLayer.push()`
 - Retorna `totalOfAds` de `page.detail.totalOfAds` se disponível
 - Retorna `null` se não encontrar ou houver erro

- `urlAlreadySearched(url)`: Verifica histórico de buscas
 - Consulta tabela `logs` para verificar se URL já foi pesquisada
 - Retorna `true` se já foi pesquisada (deve notificar)
 - Retorna `false` na primeira execução (não notifica)

- `setUrlParam(url, param, value)`: Utilitário para modificar parâmetros de URL
 - Usado para adicionar parâmetro `o` (página) à URL

**Variáveis de Estado** (resetadas a cada URL):
- `page`: Número da página atual
- `maxPrice`, `minPrice`, `sumPrices`: Estatísticas de preços
- `validAds`: Contador de anúncios válidos
- `adsFound`: Total de anúncios encontrados
- `nextPage`: Flag para continuar paginação
- `maxAdsLimit`: Limite de anúncios a processar (pode ser `totalOfAds` ou `MAX_ADS_PER_SEARCH`)
- `totalOfAds`: Total de anúncios extraído do dataLayer (null se não disponível)

---

### 3. Ad.js
**Responsabilidade**: Processamento e validação de anúncios individuais

**Classe Ad**:

**Propriedades**:
- `id`: ID único do anúncio (listId do OLX)
- `url`: URL completa do anúncio
- `title`: Título do anúncio
- `searchTerm`: Termo de busca associado
- `price`: Preço do anúncio (número inteiro)
- `valid`: Flag indicando se anúncio é válido
- `saved`: Dados do anúncio salvos no banco (se existir)
- `notify`: Flag indicando se deve notificar

**Métodos Principais**:

- `process()`: Método principal de processamento
  - Valida anúncio
  - Verifica se já existe no banco
  - Se novo: adiciona ao banco e notifica
  - Se existente: verifica mudança de preço

- `isValidAd()`: Validação básica
  - Verifica se preço é um número válido
  - Verifica se URL existe
  - Verifica se ID existe
  - Retorna `true` se válido

- `alreadySaved()`: Verifica existência no banco
  - Consulta `adRepository.getAd(id)`
  - Armazena resultado em `this.saved`

- `addToDataBase()`: Cria novo registro
  - Salva anúncio via `adRepository.createAd()`
  - Envia notificação se `notify === true`

- `checkPriceChange()`: Detecta alterações de preço
 - Compara preço atual com preço salvo
 - Se diferente: atualiza banco
 - Se redução maior que 5%: calcula percentual e notifica
 - Reduções menores que 5% são atualizadas no banco mas não notificadas

---

### 4. HttpClient.js
**Responsabilidade**: Requisições HTTP com proteção contra detecção

**Funcionalidades**:
- Utiliza CycleTLS para requisições HTTP avançadas
- Rotaciona fingerprints aleatoriamente
- Simula navegador real com headers apropriados

**Implementação**:
- Seleciona fingerprint aleatório de `requestsFingerprints.js`
- Configura headers de navegador real
- Usa JA3 fingerprint para evitar detecção
- Retorna body da resposta HTML

**Fingerprints**:
- User-Agent: Simula Firefox no Linux
- JA3: Fingerprint TLS específico para evitar detecção

---

### 5. CycleTls.js
**Responsabilidade**: Gerenciamento da instância CycleTLS

**Funcionalidades**:
- Inicializa instância única do CycleTLS
- Fornece acesso à instância para outros componentes
- Gerencia ciclo de vida (inicialização e encerramento)

**Padrão Singleton**: Uma única instância é criada e reutilizada

---

### 6. Notifier.js
**Responsabilidade**: Envio de notificações via Telegram

**Funcionalidades**:
- Envia mensagens para chat do Telegram
- Usa Telegram Bot API
- Timeout de 5 segundos para evitar bloqueios

**API Utilizada**:
```
GET https://api.telegram.org/bot{TOKEN}/sendMessage?chat_id={CHAT_ID}&text={MESSAGE}
```

**Formato de Mensagens**:
- Novo anúncio: `"New ad found!\n{title} - R${price}\n\n{url}"`
- Redução de preço: `"Price drop found! {percentage}% OFF!\nFrom R${oldPrice} to R${newPrice}\n\n{url}"`

---

### 7. Logger.js
**Responsabilidade**: Sistema de logging

**Funcionalidades**:
- Logs em arquivo (`data/scrapper.log`)
- Formato de timestamp configurável
- Níveis: INFO, DEBUG, ERROR

**Configuração** (em `config.js`):
```javascript
config.logger = {
    logFilePath: '../data/scrapper.log',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss'
}
```

---

### 8. database.js
**Responsabilidade**: Configuração e inicialização do banco SQLite

**Tabelas Criadas**:

**ads**:
- `id` (INTEGER, UNIQUE): ID do anúncio
- `searchTerm` (TEXT): Termo de busca
- `title` (TEXT): Título do anúncio
- `price` (INTEGER): Preço atual
- `url` (TEXT): URL do anúncio
- `created` (TEXT): Data de criação (ISO)
- `lastUpdate` (TEXT): Última atualização (ISO)

**logs**:
- `id` (INTEGER, AUTOINCREMENT, PRIMARY KEY): ID do log
- `url` (TEXT): URL pesquisada
- `adsFound` (INTEGER): Quantidade de anúncios válidos encontrados
- `averagePrice` (NUMERIC): Preço médio
- `minPrice` (NUMERIC): Preço mínimo
- `maxPrice` (NUMERIC): Preço máximo
- `created` (TEXT): Data de criação (ISO)

**Função**:
- `createTables()`: Cria tabelas se não existirem (IF NOT EXISTS)

---

### 9. adRepository.js
**Responsabilidade**: Operações CRUD para anúncios

**Funções**:

- `getAd(id)`: Busca anúncio por ID
  - Retorna Promise com dados do anúncio
  - Rejeita se não encontrado

- `getAdsBySearchTerm(term, limit)`: Busca por termo
  - Retorna array de anúncios
  - Limitado pelo parâmetro `limit`

- `getAdsBySearchId(id, limit)`: Busca por searchId (não usado atualmente)

- `createAd(ad)`: Cria novo anúncio
  - Insere registro na tabela `ads`
  - Define `created` e `lastUpdate` como timestamp atual

- `updateAd(ad)`: Atualiza anúncio existente
  - Atualiza `price` e `lastUpdate`
  - Busca por `id`

---

### 10. scrapperRepository.js
**Responsabilidade**: Operações para logs de execução

**Funções**:

- `saveLog(data)`: Salva log de execução
  - Recebe objeto com: `url`, `adsFound`, `averagePrice`, `minPrice`, `maxPrice`
  - Insere na tabela `logs`

- `getLogsByUrl(url, limit)`: Busca logs por URL
  - Usado para verificar se URL já foi pesquisada
  - Retorna array de logs (limitado)

---

## Configuração

### Arquivo config.js

**Estrutura**:
```javascript
{
    urls: Array<string>,           // URLs do OLX para monitorar
    interval: string,               // Intervalo cron (ex: '*/5 * * * *')
    telegramChatID: string,        // ID do chat Telegram
    telegramToken: string,          // Token do bot Telegram
    dbFile: string,                // Caminho do banco SQLite
    logger: {                       // Configuração do logger
        logFilePath: string,
        timestampFormat: string
    }
}
```

**Exemplo**:
```javascript
config.urls = [
    'https://www.olx.com.br/imoveis/estado-rj/rio-de-janeiro-e-regiao/itaborai-e-regiao/mage?pe=300000'
]
config.interval = '*/5 * * * *'  // A cada 5 minutos
```

**Intervalos Cron**:
- `'*/5 * * * *'` - A cada 5 minutos
- `'0 * * * *'` - A cada hora
- `'0 */2 * * *'` - A cada 2 horas
- `'0 9 * * *'` - Todo dia às 9h

Ferramenta para criar intervalos: https://tool.crontap.com/cronjob-debugger

---

### Arquivo .env

**Variáveis Necessárias**:
```
TELEGRAM_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
```

**Como Obter**:
1. **TELEGRAM_TOKEN**: Criar bot no BotFather (@BotFather no Telegram)
2. **TELEGRAM_CHAT_ID**: 
   - Criar grupo no Telegram
   - Adicionar seu bot e o @idbot
   - Digitar `/getgroupid@myidbot` no grupo

---

## Dependências

### Principais

- **axios** (^1.6.2): Cliente HTTP para requisições ao Telegram API
- **cheerio** (^1.0.0-rc.3): Parser HTML/XML (similar ao jQuery)
- **cycletls** (^1.0.24): Cliente HTTP avançado com fingerprinting TLS
- **dotenv** (^8.2.0): Carregamento de variáveis de ambiente
- **node-cron** (^3.0.2): Agendamento de tarefas recorrentes
- **simple-node-logger** (^18.12.24): Sistema de logging
- **sqlite3** (^5.1.6): Driver SQLite para Node.js

### Desenvolvimento

- **nodemon** (^3.0.1): Auto-reload durante desenvolvimento

---

## Banco de Dados

### Estrutura

**Tabela: ads**
Armazena todos os anúncios monitorados.

**Campos**:
- `id`: Identificador único do anúncio (chave primária)
- `searchTerm`: Termo de busca extraído da URL
- `title`: Título do anúncio
- `price`: Preço atual (INTEGER)
- `url`: URL completa do anúncio
- `created`: Timestamp de quando foi adicionado ao banco
- `lastUpdate`: Timestamp da última atualização de preço

**Tabela: logs**
Armazena histórico de execuções do scraper.

**Campos**:
- `id`: ID auto-incrementado
- `url`: URL que foi pesquisada
- `adsFound`: Quantidade de anúncios válidos encontrados
- `averagePrice`: Preço médio dos anúncios
- `minPrice`: Menor preço encontrado
- `maxPrice`: Maior preço encontrado
- `created`: Timestamp da execução

### Localização
Banco de dados: `data/ads.db` (relativo à pasta `src/`)

---

## Fluxo de Dados

### Processamento de Anúncio

```
1. Scraper extrai dados da página OLX
   ↓
2. Cria instância Ad com dados extraídos
   ↓
3. Ad.valida() verifica se anúncio é válido
   ↓
4. Ad.alreadySaved() consulta banco
   ↓
5a. Se novo:
    → Ad.addToDataBase() salva no banco
    → Notifier.sendNotification() envia mensagem (se notify=true)
   
5b. Se existente:
    → Ad.checkPriceChange() compara preços
    → Se redução: atualiza banco e notifica
```

### Extração de Dados do OLX

O OLX utiliza Next.js e embute dados em JSON dentro de um script:

```html
<script id="__NEXT_DATA__" type="application/json">
{
  "props": {
    "pageProps": {
      "ads": [
        {
          "listId": 123456,
          "subject": "Título do anúncio",
          "url": "https://...",
          "price": "R$ 1.500"
        }
      ]
    }
  }
}
</script>
```

O scraper:
1. Carrega HTML com Cheerio
2. Extrai conteúdo do script `#__NEXT_DATA__`
3. Faz parse do JSON
4. Acessa `props.pageProps.ads`
5. Processa cada anúncio do array

---

## Padrões e Convenções

### Nomenclatura

- **Arquivos**: camelCase (ex: `adRepository.js`)
- **Classes**: PascalCase (ex: `Ad`)
- **Funções**: camelCase (ex: `scrapePage`)
- **Variáveis**: camelCase (ex: `maxPrice`)
- **Constantes**: UPPER_SNAKE_CASE (ex: `TELEGRAM_TOKEN`)

### Convenções de Código

- Uso de `async/await` para operações assíncronas
- Promises para operações de banco de dados
- Try-catch para tratamento de erros
- Logging em pontos críticos
- Validação de dados antes de processar

### Estrutura de Erros

- Erros são logados mas não interrompem execução completa
- Cada URL é processada independentemente
- Falha em uma URL não afeta outras

---

## Limitações e Considerações

### Limitações Conhecidas

1. **Apenas OLX Brasil**: Funciona apenas com versão brasileira do OLX
   - Outros países têm estrutura HTML diferente
   - Adaptação requereria mudanças em `Scraper.js`

2. **Primeira Execução**: Não envia notificações na primeira execução
   - Evita spam de notificações de anúncios já existentes
   - Apenas novos anúncios após primeira execução são notificados

3. **Detecção de Bots**: Apesar do fingerprinting, pode ser detectado
   - Recomenda-se intervalos razoáveis entre requisições
   - URLs muito amplas podem gerar muitas requisições

4. **Preços**: Apenas reduções de preço são notificadas
   - Aumentos de preço são atualizados no banco mas não notificados

### Boas Práticas

1. **URLs Específicas**: Use filtros específicos nas URLs
   - Evita processar muitos anúncios
   - Reduz carga no servidor OLX
   - Diminui risco de bloqueio

2. **Intervalos Adequados**: Configure intervalos razoáveis
   - Mínimo recomendado: 5 minutos
   - Para muitas URLs: considerar intervalos maiores

3. **Monitoramento**: Acompanhe logs regularmente
   - Verifique erros em `data/scrapper.log`
   - Monitore tamanho do banco de dados

---

## Extensibilidade

### Adicionar Novos Canais de Notificação

1. Criar novo componente em `components/` (ex: `EmailNotifier.js`)
2. Implementar função de envio similar a `Notifier.js`
3. Integrar em `Ad.js` nos métodos `addToDataBase()` e `checkPriceChange()`

### Adaptar para Outros Países

1. Modificar `Scraper.js`
2. Ajustar seletor do script `__NEXT_DATA__` se necessário
3. Verificar estrutura JSON retornada pelo OLX do país
4. Ajustar extração de dados conforme estrutura

### Adicionar Filtros de Anúncios

1. Adicionar validações em `Ad.isValidAd()`
2. Implementar filtros por palavras-chave, faixa de preço, etc.
3. Considerar criar arquivo de configuração de filtros

### Melhorias Possíveis

- **Cache de Requisições**: Reduzir requisições duplicadas
- **Rate Limiting**: Controlar frequência de requisições
- **Retry Logic**: Tentar novamente em caso de falha
- **Dashboard Web**: Interface para visualizar anúncios monitorados
- **Filtros Avançados**: Filtros por palavras-chave, localização, etc.
- **Múltiplos Canais**: Email, Discord, WhatsApp, etc.

---

## Troubleshooting

### Problemas Comuns

**1. Erro ao conectar ao Telegram**
- Verificar se `TELEGRAM_TOKEN` e `TELEGRAM_CHAT_ID` estão corretos
- Verificar se bot foi adicionado ao grupo
- Verificar conexão com internet

**2. Nenhuma notificação na primeira execução**
- Comportamento esperado: primeira execução não notifica
- Aguardar segunda execução (após intervalo configurado)

**3. Erro ao fazer scraping**
- Verificar se URL do OLX está correta e acessível
- Verificar estrutura HTML do OLX (pode ter mudado)
- Verificar logs em `data/scrapper.log`

**4. Banco de dados não criado**
- Verificar permissões de escrita na pasta `data/`
- Verificar se pasta `data/` existe

**5. Muitas requisições / possível bloqueio**
- Aumentar intervalo entre execuções
- Reduzir número de URLs monitoradas
- Usar URLs mais específicas com filtros

---

## Comandos Úteis

### Desenvolvimento
```bash
cd src
npm run dev        # Executa com nodemon (auto-reload)
```

### Produção
```bash
cd src
npm start          # Executa normalmente
node index.js      # Alternativa
```

### Docker
```bash
docker-compose build    # Build da imagem (primeira vez)
docker-compose up       # Executa container
```

### Verificar Logs
```bash
# Windows PowerShell
Get-Content data\scrapper.log -Tail 50

# Linux/Mac
tail -f data/scrapper.log
```

### Verificar Banco de Dados
```bash
# Usar ferramenta SQLite
sqlite3 data/ads.db

# Consultas úteis:
SELECT COUNT(*) FROM ads;
SELECT * FROM ads ORDER BY lastUpdate DESC LIMIT 10;
SELECT * FROM logs ORDER BY created DESC LIMIT 5;
```

---

## Informações Técnicas Adicionais

### Ciclo de Vida da Aplicação

1. **Inicialização**: Uma vez ao iniciar
2. **Primeira Execução**: Imediatamente após inicialização
3. **Execuções Periódicas**: Conforme intervalo cron configurado
4. **Encerramento**: Ctrl+C ou kill do processo

### Threading e Concorrência

- Aplicação é single-threaded (Node.js)
- Requisições HTTP são assíncronas (não bloqueiam)
- Processamento de URLs é sequencial (uma por vez)
- Processamento de anúncios dentro de uma URL é sequencial

### Performance

- Tempo de processamento depende de:
  - Número de URLs configuradas
  - Quantidade de páginas por URL
  - Quantidade de anúncios por página
  - Velocidade de resposta do OLX
  - Velocidade de escrita no banco SQLite

### Segurança

- Tokens do Telegram não devem ser commitados
- Arquivo `.env` deve estar no `.gitignore`
- Banco de dados contém apenas dados públicos (anúncios)
- Não há autenticação ou dados sensíveis armazenados

---

## Referências

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [node-cron Documentation](https://www.npmjs.com/package/node-cron)
- [Cheerio Documentation](https://cheerio.js.org/)
- [CycleTLS Documentation](https://github.com/Danny-Dasilva/CycleTLS)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## Contato e Suporte

- **Autor**: Augusto Carmo
- **Licença**: MIT
- **Repositório**: https://github.com/carmolim/olx-monitor

---

*Última atualização: Dezembro 2025*

