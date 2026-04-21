import { io } from "socket.io-client";
import { SERVER_URL } from "./config";

let socket;

const ensureConnected = () => {
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
  return socket;
};

// Connect and register userId with the server for message routing
export const connectSocket = (userId) => {
  ensureConnected();

  socket.off("connect");

  const doRegister = () => {
    if (userId) socket.emit("register", userId);
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

// Promise wrapper using socket.io acknowledgments (built-in request-response)
const socketRequest = (event, data) =>
  new Promise((resolve, reject) => {
    ensureConnected();

    const doRequest = () => {
      socket.emit(event, data, (response) => {
        if (response.error) reject(new Error(response.error));
        else resolve(response);
      });
    };

    if (socket.connected) {
      doRequest();
    } else {
      socket.once("connect", doRequest);
    }
  });

// Find or create a user by name
export const registerUser = (name) => socketRequest("registerUser", { name });

// Get all users except the current user
export const fetchUsers = (excludeUserId) => socketRequest("getUsers", { excludeUserId });

// Load conversation + message history between two users
export const loadChat = (userId1, userId2) => socketRequest("loadChat", { userId1, userId2 });

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
