import express from "express";
import colors from "colors";

export function createApp() {
  const app = express();

  app.use(express.json());

  
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: ("settleup-api") });
  });

  return app;
}
