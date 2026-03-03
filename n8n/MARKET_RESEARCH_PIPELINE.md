# Market Research Pipeline - Workflow n8n

## Visão geral

Workflow que coleta dados de mercado via APIs, consolida em planilhas Google Sheets e retorna relatórios estruturados.

**Arquivo:** `n8n/market_research_pipeline.json`

## Fluxo

```
Webhook (POST /market-research)
  → Parse Request (extrai topic, period, sources)
  → Serper Web Search (busca na web)
  → Estruturar Dados (formata resultados em tabela)
  → Criar Planilha (Google Sheets)
  → Rows to Items (prepara linhas)
  → Preencher Planilha (append das linhas)
  → Montar resposta webhook
  → Retornar Pesquisa (Respond to Webhook)
```

## Configuração

### 1. Importar o workflow

No n8n, vá em Workflows → Import from File e selecione `market_research_pipeline.json`.

### 2. Credenciais necessárias

#### Serper API (busca web)
- Crie em [serper.dev](https://serper.dev)
- No n8n: Credentials → Add credential → Header Auth
- **Name:** `X-API-KEY`
- **Value:** sua chave Serper

#### Google Sheets
- Credential type: **Google Sheets OAuth2 API**
- Siga o fluxo OAuth no n8n para autorizar acesso à sua conta Google
- Necessário para criar planilhas e preencher dados

### 3. Vincular credenciais

- **Serper Web Search:** selecione a credencial Header Auth com X-API-KEY
- **Criar Planilha** e **Preencher Planilha:** selecione a credencial Google Sheets

### 4. Webhook

- **Path:** `market-research`
- **URL completa (exemplo):** `https://seu-n8n.app.n8n.cloud/webhook/market-research`

## Contrato da API

### Request
- **Method:** POST
- **Content-Type:** application/json
- **Body:**
  ```json
  {
    "topic": "Mercado de bancos digitais no Brasil",
    "period": "12",
    "sources": ""
  }
  ```
- `topic` (obrigatório): tópico de pesquisa
- `period` (opcional): meses de referência (ex: "6", "12", "24")
- `sources` (opcional): filtro de fontes ("", "apis", "web")

### Response
```json
{
  "sheets_url": "https://docs.google.com/spreadsheets/d/XXX/edit",
  "report_url": "https://docs.google.com/spreadsheets/d/XXX/edit",
  "report_title": "Pesquisa: Mercado de bancos digitais",
  "reasoning": "Pesquisa executada sobre...",
  "error": null
}
```

- `sheets_url`: link para a planilha consolidada
- `report_url`: mesmo link (planilha serve como relatório)
- `report_title`: título gerado
- `reasoning`: resumo da pesquisa
- `error`: mensagem se algo falhou (ex.: credenciais Google não configuradas)

## Padrão de resposta (MONTAR_RESPOSTA_WEBHOOK_FIX)

O node "Montar resposta webhook" segue o padrão do `MONTAR_RESPOSTA_WEBHOOK_FIX.md`, garantindo que o frontend receba um JSON válido com `sheets_url` e `reasoning` mesmo quando há falhas parciais.

## Extensões futuras

- Integrar **Brapi** e **FMP** para dados financeiros (quando `sources` incluir "apis")
- Adicionar **IA (Groq)** para consolidar e resumir resultados
- Gerar **gráficos** na planilha via Google Sheets API
