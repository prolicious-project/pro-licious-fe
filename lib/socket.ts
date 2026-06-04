import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const initSocket = (token?: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return socket;
};

export const getSocket = (token?: string) => {
  if (!socket) {
    return initSocket(token);
  }
  return socket;
};

