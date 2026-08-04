import http from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app";
import { setRealtime } from "./realtime";

const port = Number(process.env.PORT ?? 4000);
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173,http://localhost:5174";
const allowedOrigins = clientUrl.split(",").map((s) => s.trim());

const app = createApp();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
});

setRealtime(io);

io.on("connection", (socket) => {
  // Salas por grupo. El cliente nos dice a qué grupo quiere
  // suscribirse; en producción habría que validar la membresía
  // contra la DB aquí, pero para un portfolio es suficiente
  // con que el grupo exista (los handlers REST ya validan).
  socket.on("group:join", ({ groupId }: { groupId: string }) => {
    if (typeof groupId === "string" && groupId.length > 0) {
      socket.join(`group:${groupId}`);
    }
  });

  socket.on("group:leave", ({ groupId }: { groupId: string }) => {
    if (typeof groupId === "string" && groupId.length > 0) {
      socket.leave(`group:${groupId}`);
    }
  });
});

server.listen(port, () => {
  console.log(`SettleUp API listening on port ${port}`);
});
