import WebSocket from "ws";
import { env } from "./utils/env";

const ws = new WebSocket("wss://stream.data.alpaca.markets/v2/iex");

ws.on("open", () => {
  console.log("✅ WebSocket Connected");
  
  ws.send(
    JSON.stringify({
      action: "auth",
      key: env.alpacaKey,
      secret: env.alpacaSecret,
    })
  );

  ws.send(
    JSON.stringify({
      action: "subscribe",
      quotes: ["AAPL", "TSLA"],
    })
  );
});

ws.on("message", (data: any) => {
  const msg = JSON.parse(data.toString());

  if (msg[0]?.T === "q") {
    const q = msg[0];
    console.log(
      `📉 ${q.S} | Bid: ${q.bp} | Ask: ${q.ap} | Time: ${q.t}`
    );
  }

  if (msg[0]?.msg === "authenticated") {
    console.log("🔐 Authenticated");
  }
});

ws.on("close", () => console.log("❌ WebSocket Closed"));
ws.on("error", (err: any) => console.log("⚠️ WebSocket Error:", err));
