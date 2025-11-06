import { Router, Request, Response } from "express";
import Alpaca from "@alpacahq/alpaca-trade-api";
import { createAlpacaInstance } from "../utils/alpacaFactory";
import { authenticateToken, AuthenticatedRequest } from "../utils/auth";
import { userStorage } from "../utils/userStorage";

export default function createAlpacaRouter(app: any) {
const router = Router();

  router.use(authenticateToken);

  async function getUserAlpaca(req: AuthenticatedRequest): Promise<Alpaca> {
    if (!req.user) {
      throw new Error("User not authenticated");
    }
    const user = await userStorage.getUserById(req.user.userId);
    if (!user) {
      throw new Error("User not found");
    }
    return createAlpacaInstance(user);
  }

  router.get("/account", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alpaca = await getUserAlpaca(req);
      const account = await alpaca.getAccount();
      res.json(account);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/positions", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const alpaca = await getUserAlpaca(req);
      const positions = await alpaca.getPositions();
      res.json(positions);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

    router.get("/orders", async (req: AuthenticatedRequest, res: Response) => {
    try {
        const alpaca = await getUserAlpaca(req);
        const orders = await alpaca.getOrders({
        status: "all",     
        until: undefined,
        after: undefined,
        limit: undefined,
        direction: "desc", 
        nested: true,
        symbols: undefined,
        });
        res.json(orders);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
    });

    router.get("/trades", async (req: AuthenticatedRequest, res: Response) => {
        try {
            const alpaca = await getUserAlpaca(req);
            const limit = Number(req.query.limit ?? 100);
            const after = req.query.after ? String(req.query.after) : undefined;
            const until = req.query.until ? String(req.query.until) : undefined;

            const params: any = {
            activity_types: "FILL",
            page_size: limit,
            };

            if (after) params.after = after;
            if (until) params.until = until;

            const activities = await alpaca.getAccountActivities(params);

            res.json({
            success: true,
            count: activities.length,
            data: activities,
            });
        } catch (err: any) {
            res.status(err?.response?.status || 500).json({
            success: false,
            error: err?.response?.data || err.message,
            });
        }
    });


    router.get("/candles/:symbol", async (req: AuthenticatedRequest, res: Response) => {
        try {
            const alpaca = await getUserAlpaca(req);
            const symbol = (req.params.symbol || "").toUpperCase();
            if (!symbol) return res.status(400).json({ success: false, error: "symbol required" });

            const tfRaw = String(req.query.timeframe ?? "1D");
            const timeframe = tfRaw.replace("1Day", "1D").replace("1day", "1D");

            const limit = Number(req.query.limit ?? 100);

            const start = req.query.start
            ? String(req.query.start)
            : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

            const end = req.query.end ? String(req.query.end) : new Date().toISOString();

            const barsIter = alpaca.getBarsV2(symbol, { timeframe, limit, start, end });

            const bars: any[] = [];
            for await (const bar of barsIter) bars.push(bar);

            return res.json({
            success: true,
            symbol,
            timeframe,
            count: bars.length,
            bars
            });

        } catch (err: any) {
            res.status(err?.response?.status || 500).json({
            success: false,
            error: err?.response?.data || err.message
            });
        }
    });

    router.get("/portfolio/history", async (req: AuthenticatedRequest, res: Response) => {
        try {
            const alpaca = await getUserAlpaca(req);
            const {
                period = "1M",
                timeframe = "1D",
                date_start,
                date_end,
            } = req.query;

            const history = await alpaca.getPortfolioHistory({
                date_start: date_start ? String(date_start) : undefined, 
                date_end: date_end ? String(date_end) : undefined,
                period: String(period),          
                timeframe: String(timeframe),  
                extended_hours: true,
            });

            res.json(history);
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    router.get("/export/trades.:format?", async (req: AuthenticatedRequest, res: Response) => {
        try {
            const alpaca = await getUserAlpaca(req);
            const format = (req.params.format || req.query.format || "csv").toString().toLowerCase();
            const limit = Number(req.query.limit ?? 1000);
            const after = req.query.after ? String(req.query.after) : undefined;
            const until = req.query.until ? String(req.query.until) : undefined;

            const params: any = { activity_types: "FILL", limit };
            if (after) params.after = after;
            if (until) params.until = until;

            const response = await alpaca.getAccountActivities( params );
            const rows = Array.isArray(response.data) ? response.data : [];

            if (format === "json") {
                return res.json({ success: true, count: rows.length, data: rows });
            }

            const headers = [
            "activity_id",
            "symbol",
            "side",
            "qty",
            "price",
            "filled_at",
            "order_id",
            "type",
            "trade_summary"
            ];
            const csvLines = [headers.join(",")];

            for (const r of rows) {
            const line = [
                `"${r.id ?? ""}"`,
                `"${(r.symbol ?? "").toString().replace(/"/g, '""')}"`,
                `"${r.side ?? ""}"`,
                `"${r.qty ?? ""}"`,
                `"${r.price ?? r.exec_price ?? ""}"`,
                `"${r.transaction_time ?? r.filled_at ?? ""}"`,
                `"${r.order_id ?? ""}"`,
                `"${r.type ?? ""}"`,
                `"${(r.description ?? "") .toString().replace(/"/g, '""')}"`
            ].join(",");
            csvLines.push(line);
            }

            const csv = csvLines.join("\n");
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="alpaca_trades_${Date.now()}.csv"`);
            res.send(csv);
        } catch (err: any) {
            res.status(err?.response?.status || 500).json({ success: false, error: err?.response?.data || err.message });
        }
    });

    router.ws("/stream/pnl", async (ws: any, req: any) => {
        try {
            const authHeader = req.headers.authorization || req.headers.cookie;
            const token = authHeader?.split(" ")[1] || authHeader?.split("=")[1];
            
            if (!token) {
                ws.close(1008, "Authentication required");
                return;
            }

            const { verifyToken } = require("../utils/auth");
            const payload = verifyToken(token);
            if (!payload) {
                ws.close(1008, "Invalid token");
                return;
            }

            const user = await userStorage.getUserById(payload.userId);
            if (!user) {
                ws.close(1008, "User not found");
                return;
            }

            const alpaca = createAlpacaInstance(user);
            const intervalSec = Number(req.query.interval ?? 5);
            const symbols: string[] = (req.query.symbols ? String(req.query.symbols).split(",").map(s => s.trim().toUpperCase()) : []);

            let timer: NodeJS.Timeout | null = null;
            let closed = false;

            async function sendSnapshot() {
                try {
                const accRes = await alpaca.getAccount();
                const account = accRes.data;

                const posRes = await alpaca.getPositions();
                let positions = Array.isArray(posRes.data) ? posRes.data : [];
                if (symbols.length > 0) {
                    positions = positions.filter((p: any) => symbols.includes(String(p.symbol).toUpperCase()));
                }

                const unrealized = positions.reduce((sum: number, p: any) => sum + Number(p.unrealized_pl || 0), 0);
                const realized = positions.reduce((sum: number, p: any) => sum + Number(p.realized_pl || 0), 0); // may be 0 per position
                const snapshot = {
                    timestamp: new Date().toISOString(),
                    equity: account.equity,
                    cash: account.cash,
                    portfolio_value: account.portfolio_value,
                    buying_power: account.buying_power,
                    unrealized_pl: unrealized,
                    realized_pl: realized,
                    positions,
                };

                ws.send(JSON.stringify({ success: true, snapshot }));
                } catch (err: any) {
                ws.send(JSON.stringify({ success: false, error: err?.response?.data || err.message }));
                }
            }

            sendSnapshot();
            timer = setInterval(() => {
                if (!closed) sendSnapshot();
            }, Math.max(1000, intervalSec * 1000));

            ws.on("close", () => {
                closed = true;
                if (timer) clearInterval(timer);
            });

            ws.on("error", () => {
                closed = true;
                if (timer) clearInterval(timer);
            });
    } catch (error: any) {
            ws.close(1008, error.message || "Connection failed");
        }
    });


    app.ws("/api/alpaca/stream", async (ws: any, req: any) => {
        try {
            // Get user from token
            const authHeader = req.headers.authorization || req.headers.cookie;
            const token = authHeader?.split(" ")[1] || authHeader?.split("=")[1];
            
            if (!token) {
                ws.close(1008, "Authentication required");
                return;
            }

            const { verifyToken } = require("../utils/auth");
            const payload = verifyToken(token);
            if (!payload) {
                ws.close(1008, "Invalid token");
                return;
            }

            const user = await userStorage.getUserById(payload.userId);
            if (!user) {
                ws.close(1008, "User not found");
                return;
            }

            const alpaca = createAlpacaInstance(user);
            const stream = alpaca.data_stream_v2;

            stream.onConnect(() => {
                console.log("📡 Alpaca WS Connected for user:", user.name);
                stream.subscribeForTrades(["AAPL", "TSLA"]); 
            });

            stream.onError((e: any) => ws.send(JSON.stringify({ error: e })));

            stream.onStockTrade((trade: any) => {
                ws.send(JSON.stringify({ symbol: trade.S, price: trade.p }));
            });

            stream.connect();

            ws.on("close", () => {
                console.log("❌ Client disconnected for user:", user.name);
                stream.disconnect();
            });
        } catch (error: any) {
            ws.close(1008, error.message || "Connection failed");
        }
    });

  return router;
}
