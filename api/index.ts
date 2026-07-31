// Vercel Serverless Function — expone la app Express de FlipTrack
// (server.ts exporta `app` y omite app.listen() cuando corre en Vercel)
export { app as default } from "../server/app.js";
