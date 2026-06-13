import {
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData
} from "@multiplayer-blueprint/shared";
import express from "express";
import { existsSync } from "node:fs";
import { createServer, type Server as HttpServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server, type ServerOptions } from "socket.io";
import { RoomManager } from "./rooms/roomManager.js";
import { registerSocketHandlers } from "./socket/handlers.js";

type TypedSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type ApplicationOptions = {
  roomManager?: RoomManager;
  cleanupIntervalMs?: number;
  bustRevealMs?: number;
};

export type ApplicationInstance = {
  app: express.Express;
  httpServer: HttpServer;
  io: TypedSocketServer;
  roomManager: RoomManager;
  shutdown: () => Promise<void>;
};

function getCorsOrigin(): string[] | false {
  const configuredOrigin = process.env.CLIENT_ORIGIN;
  if (configuredOrigin !== undefined && configuredOrigin.trim().length > 0) {
    return configuredOrigin.split(",").map((origin) => origin.trim());
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }

  return false;
}

function serveClientBuild(app: express.Express): void {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const clientDistPath = resolve(currentDir, "../../client/dist");
  const indexPath = join(clientDistPath, "index.html");

  if (!existsSync(indexPath)) {
    return;
  }

  app.use(express.static(clientDistPath));
  app.get("*", (request, response, next) => {
    if (request.path.startsWith("/socket.io")) {
      next();
      return;
    }

    response.sendFile(indexPath);
  });
}

export function createApplication(
  options: ApplicationOptions = {}
): ApplicationInstance {
  const app = express();
  const httpServer = createServer(app);
  const roomManager = options.roomManager ?? new RoomManager();
  const corsOrigin = getCorsOrigin();
  const socketOptions: Partial<ServerOptions> = {
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true
    }
  };

  if (corsOrigin !== false) {
    socketOptions.cors = {
      origin: corsOrigin,
      credentials: true
    };
  }

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, socketOptions);

  const handlerOptions = {
    ...(options.cleanupIntervalMs === undefined
      ? {}
      : {
          cleanupIntervalMs: options.cleanupIntervalMs
        }),
    ...(options.bustRevealMs === undefined
      ? {}
      : {
          bustRevealMs: options.bustRevealMs
        })
  };
  const socketLifecycle = registerSocketHandlers(io, roomManager, handlerOptions);

  app.use(express.json());
  app.get("/health", (_request, response) => {
    response.json({
      status: "ok"
    });
  });

  serveClientBuild(app);

  return {
    app,
    httpServer,
    io,
    roomManager,
    shutdown: async () => {
      socketLifecycle.stop();
      await new Promise<void>((resolveShutdown) => {
        io.close(() => {
          httpServer.close(() => resolveShutdown());
        });
      });
    }
  };
}
