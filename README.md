## Alpaca API – REST Routing and Documentation

This project wraps key Alpaca endpoints behind a small Express server with clean routes and Swagger UI documentation. Original CLI scripts remain intact under `src/*.ts`.

### Prerequisites
- Node.js 18+
- Alpaca API credentials (paper or live)

### Environment
Create a `.env` file in the project root:

```
ALPACA_API_KEY_ID=YOUR_KEY
ALPACA_SECRET_KEY=YOUR_SECRET
ALPACA_PAPER_URL=https://paper-api.alpaca.markets
PORT=3000
```

### Install & Run

```
npm install
npm run dev
```

Server will start at `http://localhost:3000`. API docs available at `http://localhost:3000/docs`.

### Routes
- `GET /health` – simple health check
- `GET /api/account` – account information
- `GET /api/positions` – open positions
- `GET /api/trades?types=FILL` – account activities (comma-separated `types`)
- `GET /api/quotes/:symbol` – latest quote for a symbol (e.g. `AAPL`)

### Project Structure
- `src/server.ts` – Express app bootstrap and docs
- `src/clients/alpaca.ts` – shared Axios clients
- `src/routes/*` – route modules
- `src/docs/openapi.json` – OpenAPI 3 spec powering Swagger UI
- Existing CLI scripts (unchanged):
  - `src/fetch-account.ts`
  - `src/fetch-positions.ts`
  - `src/fetch-quote.ts`
  - `src/fetch-trades.ts`
  - `src/stream-quotes.ts`

### Notes
- The streaming WebSocket example remains a standalone script at `src/stream-quotes.ts`.
- For production, build with `npm run build` and run `npm start` (served from `dist`).


