import express from "express";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createProxyMiddleware } from "http-proxy-middleware";
import wispPkg from "wisp-server-node";

const wispServer = wispPkg.server || wispPkg;
const app = express();
const server = createServer();

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// Service Worker permissions
app.use((req, res, next) => {
  res.setHeader("Service-Worker-Allowed", "/");
  next();
});

// Serve local games catalog
app.get("/api/play/games", (req, res) => {
  const filePath = path.join(process.cwd(), "api", "play", "games");
  if (existsSync(filePath)) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.send(readFileSync(filePath, "utf8"));
  }
  res.json([]);
});

// Serve local songs catalog
app.get("/api/listen/top", (req, res) => {
  const filePath = path.join(process.cwd(), "api", "listen", "top");
  if (existsSync(filePath)) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return res.send(readFileSync(filePath, "utf8"));
  }
  res.json([]);
});

// Serve song playback stream resolver fallback
app.get("/api/listen/play", (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.json({
    u: "https://ia800301.us.archive.org/31/items/mup_in_the_hall_of_the_mountain_king/In_the_Hall_of_the_Mountain_King.mp3"
  });
});

// Proxy remaining /api routes upstream
app.use(
  "/api",
  createProxyMiddleware({
    target: "https://freeze.pharmasante.com.tr",
    changeOrigin: true,
    secure: true,
    on: {
      proxyReq: (proxyReq) => {
        proxyReq.removeHeader("if-none-match");
        proxyReq.removeHeader("if-modified-since");
        proxyReq.setHeader("accept-encoding", "identity");
      },
    },
  })
);

// Fallback for Scramjet proxy paths
app.use("/d", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!doctype html><script>location.reload();</script>`);
});

// Serve local static assets (games-repo, images, music, js, css)
app.use(express.static(process.cwd()));

server.on("request", (req, res) => {
  app(req, res);
});

// Wisp WebSocket multiplexer for /e/
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/e/") || req.url.startsWith("/e/")) {
    wispServer.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(8000, () => {
  console.log("Server listening at http://localhost:8000");
});
