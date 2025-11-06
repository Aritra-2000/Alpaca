import axios, { AxiosInstance } from "axios";
import { User } from "../types/user";

// Cache for user-specific clients
const clientCache = new Map<string, { trading: AxiosInstance; data: AxiosInstance }>();

export function createAlpacaClients(user: User): {
  trading: AxiosInstance;
  data: AxiosInstance;
} {
  // Check cache first
  const cached = clientCache.get(user.id);
  if (cached) {
    return cached;
  }

  // Create trading API client
  const tradingClient = axios.create({
    baseURL: user.alpacaPaperUrl || "https://paper-api.alpaca.markets",
    headers: {
      "APCA-API-KEY-ID": user.alpacaApiKey,
      "APCA-API-SECRET-KEY": user.alpacaSecretKey,
    },
  });

  // Create data API client
  const dataClient = axios.create({
    baseURL: "https://data.alpaca.markets",
    headers: {
      "APCA-API-KEY-ID": user.alpacaApiKey,
      "APCA-API-SECRET-KEY": user.alpacaSecretKey,
    },
  });

  const clients = {
    trading: tradingClient,
    data: dataClient,
  };

  // Cache the clients
  clientCache.set(user.id, clients);

  return clients;
}

export function clearUserClients(userId: string): void {
  clientCache.delete(userId);
}

export function clearAllClients(): void {
  clientCache.clear();
}

