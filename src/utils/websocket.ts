import WebSocket from "ws";

export interface AlpacaWebSocketMessage {
  T?: string; // Message type: 'q' (quote), 't' (trade), 'b' (bar), etc.
  S?: string; // Symbol
  [key: string]: any;
}

export class AlpacaWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private authenticated: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private subscriptions: {
    trades?: string[];
    quotes?: string[];
    bars?: string[];
  } = {};

  private apiKey: string;
  private secretKey: string;

  constructor(feed: "iex" | "sip" = "iex", apiKey?: string, secretKey?: string) {
    this.url = `wss://stream.data.alpaca.markets/v2/${feed}`;
    // Use provided credentials or fall back to env (for backward compatibility)
    if (apiKey && secretKey) {
      this.apiKey = apiKey;
      this.secretKey = secretKey;
    } else {
      // Fallback to env for backward compatibility
      try {
        const { env } = require('./env');
        this.apiKey = env.alpacaKey;
        this.secretKey = env.alpacaSecret;
      } catch {
        this.apiKey = '';
        this.secretKey = '';
      }
    }
  }

  connect(onMessage?: (data: AlpacaWebSocketMessage[]) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        console.log("✅ Alpaca WebSocket Connected");
        this.authenticated = false;
        this.reconnectAttempts = 0;

        // Validate credentials before sending
        if (!this.apiKey || !this.secretKey) {
          const error = new Error("Alpaca API credentials not configured.");
          console.error("❌", error.message);
          reject(error);
          return;
        }

        // Authenticate
        this.ws?.send(
          JSON.stringify({
            action: "auth",
            key: this.apiKey,
            secret: this.secretKey,
          })
        );
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());

          // Check for authentication success
          if (Array.isArray(msg) && msg[0]?.msg === "authenticated") {
            this.authenticated = true;
            console.log("🔐 Alpaca WebSocket Authenticated");

            // Re-subscribe to previous subscriptions
            if (
              this.subscriptions.trades?.length ||
              this.subscriptions.quotes?.length ||
              this.subscriptions.bars?.length
            ) {
              this.subscribe(
                this.subscriptions.trades || [],
                this.subscriptions.quotes || [],
                this.subscriptions.bars || []
              );
            }

            resolve();
            return;
          }

          // Check for authentication error
          if (Array.isArray(msg) && (msg[0]?.msg === "unauthorized" || msg[0]?.message === "unauthorized")) {
            const errorMsg = "❌ WebSocket Authentication Failed: unauthorized";
            console.error(errorMsg);
            console.error("Please check your Alpaca API credentials");
            console.error(`Key ID present: ${this.apiKey ? 'Yes' : 'No'}, Secret present: ${this.secretKey ? 'Yes' : 'No'}`);
            this.authenticated = false;
            reject(new Error("WebSocket authentication failed: unauthorized"));
            return;
          }

          // Check for other error messages
          if (Array.isArray(msg) && msg[0]?.T === "error") {
            const errorMsg = msg[0].msg || msg[0].message || "Unknown error";
            console.error("❌ WebSocket Error:", errorMsg);
            reject(new Error(`WebSocket error: ${errorMsg}`));
            return;
          }

          // Handle data messages
          if (onMessage && Array.isArray(msg)) {
            onMessage(msg);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      this.ws.on("close", () => {
        console.log("❌ Alpaca WebSocket Closed");
        this.authenticated = false;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(
            `🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );
          setTimeout(() => {
            this.connect(onMessage).catch(console.error);
          }, this.reconnectDelay);
        }
      });

      this.ws.on("error", (error) => {
        console.error("⚠️ Alpaca WebSocket Error:", error);
        reject(error);
      });
    });
  }

  subscribe(
    trades?: string[],
    quotes?: string[],
    bars?: string[]
  ): void {
    if (!this.ws || !this.authenticated) {
      // Store subscriptions for when connection is ready
      this.subscriptions.trades = trades || this.subscriptions.trades;
      this.subscriptions.quotes = quotes || this.subscriptions.quotes;
      this.subscriptions.bars = bars || this.subscriptions.bars;
      return;
    }

    const subscribeMsg: any = {
      action: "subscribe",
    };

    if (trades && trades.length > 0) {
      subscribeMsg.trades = trades;
      this.subscriptions.trades = trades;
    }
    if (quotes && quotes.length > 0) {
      subscribeMsg.quotes = quotes;
      this.subscriptions.quotes = quotes;
    }
    if (bars && bars.length > 0) {
      subscribeMsg.bars = bars;
      this.subscriptions.bars = bars;
    }

    this.ws.send(JSON.stringify(subscribeMsg));
    console.log("📡 Subscribed to:", subscribeMsg);
  }

  unsubscribe(
    trades?: string[],
    quotes?: string[],
    bars?: string[]
  ): void {
    if (!this.ws || !this.authenticated) {
      return;
    }

    const unsubscribeMsg: any = {
      action: "unsubscribe",
    };

    if (trades && trades.length > 0) {
      unsubscribeMsg.trades = trades;
    }
    if (quotes && quotes.length > 0) {
      unsubscribeMsg.quotes = quotes;
    }
    if (bars && bars.length > 0) {
      unsubscribeMsg.bars = bars;
    }

    this.ws.send(JSON.stringify(unsubscribeMsg));
    console.log("📡 Unsubscribed from:", unsubscribeMsg);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.authenticated = false;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.authenticated;
  }
}

