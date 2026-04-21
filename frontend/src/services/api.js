import axios from "axios";
import { SERVER_URL } from "./config";

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  timeout: 10000,
});

export const findOrCreateUser = async (name) => {
  const response = await api.post("/users", { name });
  return response.data;
};

export const getAllUsers = async () => {
  const response = await api.get("/users");
  return response.data;
};

export const getOrCreateConversation = async (userId1, userId2) => {
  const response = await api.post("/conversations/get-or-create", { userId1, userId2 });
  return response.data;
};

export const getMessages = async (conversationId) => {
  const response = await api.get(`/messages/${conversationId}`);
  return response.data;
};
