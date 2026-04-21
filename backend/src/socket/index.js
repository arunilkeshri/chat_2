const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const activeUsers = new Map();

const getOrCreateConversation = async (userId1, userId2) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [userId1, userId2], $size: 2 },
  });
  if (!conversation) {
    conversation = await Conversation.create({ participants: [userId1, userId2] });
  }
  return conversation;
};

const setupSocket = (io) => {
  io.on("connection", (socket) => {

    // Register socket with userId for message routing
    socket.on("register", (userId) => {
      if (!userId) return;
      activeUsers.set(String(userId), socket.id);
    });

    // Find or create a user by name
    socket.on("registerUser", async ({ name }, callback) => {
      try {
        if (!name || !name.trim()) return callback({ error: "Name is required." });
        let user = await User.findOne({ name: name.trim() });
        if (!user) user = await User.create({ name: name.trim() });
        callback({ user });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    // Get all users except the requesting user
    socket.on("getUsers", async ({ excludeUserId }, callback) => {
      try {
        const users = await User.find({ _id: { $ne: excludeUserId } }).sort({ createdAt: -1 });
        callback({ users });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    // Load conversation and message history between two users
    socket.on("loadChat", async ({ userId1, userId2 }, callback) => {
      try {
        const conversation = await getOrCreateConversation(userId1, userId2);
        const messages = await Message.find({ conversationId: conversation._id }).sort({ timestamp: 1 });
        callback({ conversation, messages });
      } catch (error) {
        callback({ error: error.message });
      }
    });

    // Send a message
    socket.on("sendMessage", async (payload) => {
      try {
        const { conversationId, senderId, receiverId, text, clientTempId, timestamp } = payload;
        if (!senderId || !receiverId || !text) return;

        const convId = conversationId || (await getOrCreateConversation(senderId, receiverId))._id;

        const message = await Message.create({
          conversationId: convId,
          senderId,
          receiverId,
          text,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
        });

        const enrichedMessage = {
          ...message.toObject(),
          clientTempId: clientTempId || null,
        };

        const receiverSocketId = activeUsers.get(String(receiverId));
        socket.emit("messageSaved", enrichedMessage);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receiveMessage", enrichedMessage);
        }
      } catch (error) {
        socket.emit("messageError", { message: error.message });
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          activeUsers.delete(userId);
          break;
        }
      }
    });
  });
};

module.exports = setupSocket;
