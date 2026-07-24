import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientUrl,
    credentials: true
  }
});

io.on("connection", (socket) => {
  socket.emit("connected", { socketId: socket.id });
});

server.listen(port, () => {
  console.log(`SettleUp API listening on port ${port}`);
});
