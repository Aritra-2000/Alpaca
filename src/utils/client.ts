import axios from "axios";
import { env } from "./env";

export const alpaca = axios.create({
    baseURL: env.alpacaBase,
    headers: {
        "APCA-API-KEY-ID": env.alpacaKey,
        "APCA-API-SECRET-KEY": env.alpacaSecret,
    },
});

export const alpacaData = axios.create({
    baseURL: "https://data.alpaca.markets",
    headers: {
        "APCA-API-KEY-ID": env.alpacaKey,
        "APCA-API-SECRET-KEY": env.alpacaSecret,
    },
});