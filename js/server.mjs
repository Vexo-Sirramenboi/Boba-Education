import express from "express";
import { createServer } from "node:http";
import { server as wispServer } from "wisp-server-node";

const app = express();
const server = createServer();

// Serve the static mirror files from the current folder
app.use(express.static(process.cwd()));

server.on("request", (req, res) => {
  app(req, res);
});

// Route WebSocket traffic for the /e/ endpoint through wisp
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