import { app } from "./server/app";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const PORT = 3000;

async function startServer() {
  // En Vercel (serverless) no se hace app.listen: el export `app` se usa directo
  if (process.env.VERCEL) {
    console.log("FlipTrack corriendo como serverless function en Vercel");
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FlipTrack server online at http://0.0.0.0:${PORT}`);
  });
}

startServer();

