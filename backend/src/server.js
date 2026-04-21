require("dotenv").config();
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const setupSocket = require("./socket");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

app.get("/health", (req, res) => res.json({ ok: true }));

setupSocket(io);

const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
