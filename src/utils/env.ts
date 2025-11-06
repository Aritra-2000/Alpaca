

export const env = {
  alpacaKey: process.env.ALPACA_API_KEY_ID!,
  alpacaSecret: process.env.ALPACA_SECRET_KEY!,
  alpacaBase: process.env.ALPACA_PAPER_URL || "https://paper-api.alpaca.markets"
};

if (!env.alpacaKey || !env.alpacaSecret) {
  console.error("❌ Missing Alpaca API credentials!");
  console.error("Please set the following environment variables in your .env file:");
  console.error("  - ALPACA_API_KEY_ID");
  console.error("  - ALPACA_SECRET_KEY");
  console.error("  - ALPACA_PAPER_URL (optional, defaults to paper-api.alpaca.markets)");
  console.error("");
  console.error("Create a .env file in the project root with your Alpaca credentials.");
  console.error("You can get them from: https://app.alpaca.markets/paper/dashboard/overview");
  if (!env.alpacaKey) {
    throw new Error("ALPACA_API_KEY_ID is required but not set. Please create a .env file with your credentials.");
  }
  if (!env.alpacaSecret) {
    throw new Error("ALPACA_SECRET_KEY is required but not set. Please create a .env file with your credentials.");
  }
}