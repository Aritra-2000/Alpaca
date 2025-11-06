import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import expressWs from "express-ws";

import createAlpacaRouter from "./routes/alpaca";
import authRoutes from "./routes/auth";
import { env } from "./utils/env";

const app = express();
const wsInstance = expressWs(app);
const appWs = wsInstance.app; 

appWs.use(cors());
appWs.use(express.json());

appWs.get("/health", (_req, res) => res.json({ status: "ok" }));

appWs.use("/api/auth", authRoutes);

const alpacaRoutes = createAlpacaRouter(appWs);
appWs.use("/api/alpaca", alpacaRoutes);

const openapiPath = path.join(__dirname, "docs", "openapi.json");
let openapiDoc: any;
if (fs.existsSync(openapiPath)) {
  openapiDoc = JSON.parse(fs.readFileSync(openapiPath, "utf8"));
}
if (openapiDoc) {
  appWs.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
}

const port = Number(process.env.PORT || 3000);
appWs.listen(port, () => {
  void env.alpacaKey;
  console.log(`🚀 Server running at http://localhost:${port}`);
  if (openapiDoc) console.log(`📚 Docs → http://localhost:${port}/docs`);
});
