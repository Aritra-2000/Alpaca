import { AlpacaWebSocketClient } from "./websocket";
import { User } from "../types/user";

// Cache for user-specific WebSocket clients
const wsClientCache = new Map<string, AlpacaWebSocketClient>();

export function createAlpacaWebSocketClient(
  user: User,
  feed: "iex" | "sip" = "iex"
): AlpacaWebSocketClient {
  // WebSocket clients are created per connection, not cached
  // But we can use user credentials for authentication
  // Note: The actual WebSocket connection is created in the route handler
  // This factory is for creating client instances with user context
  
  return new AlpacaWebSocketClient(feed, user.alpacaApiKey, user.alpacaSecretKey);
}

export function clearUserWebSocketClients(userId: string): void {
  // WebSocket clients are ephemeral, but we can clear any cached references
  wsClientCache.delete(userId);
}

