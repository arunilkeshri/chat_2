import { io } from "socket.io-client";
import { SERVER_URL } from "./config";

let socket;

export const connectSocket = (userId) => {
  if (!socket) {
    socket = io(SERVER_URL, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  socket.off("connect");

  const doRegister = () => {
    if (userId) {
      socket.emit("register", userId);
    }
  };

  if (socket.connected) {
    doRegister();
  } else {
    socket.once("connect", doRegister);
  }

  socket.off("reconnect");
  socket.once("reconnect", doRegister);

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
