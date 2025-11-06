import Alpaca from "@alpacahq/alpaca-trade-api";
import { User } from "../types/user";

// Cache for user-specific Alpaca instances
const alpacaCache = new Map<string, Alpaca>();

export function createAlpacaInstance(user: User): Alpaca {
  // Check cache first
  const cached = alpacaCache.get(user.id);
  if (cached) {
    return cached;
  }

  // Create new Alpaca instance for this user
  const alpaca = new Alpaca({
    keyId: user.alpacaApiKey,
    secretKey: user.alpacaSecretKey,
    paper: true, // You can make this configurable per user if needed
  });

  // Cache the instance
  alpacaCache.set(user.id, alpaca);

  return alpaca;
}

export function clearUserAlpacaInstance(userId: string): void {
  alpacaCache.delete(userId);
}

export function clearAllAlpacaInstances(): void {
  alpacaCache.clear();
}


