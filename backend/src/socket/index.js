const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const activeUsers = new Map();

const getOrCreateConversationByUsers = async (senderId, receiverId) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
    });
  }

  return conversation;
};

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    socket.on("register", (userId) => {
      if (!userId) return;
      activeUsers.set(String(userId), socket.id);
    });

    socket.on("sendMessage", async (payload) => {
      try {
        const {
          conversationId,
          senderId,
          receiverId,
          text,
          clientTempId,
          timestamp,
        } = payload;

        if (!senderId || !receiverId || !text) return;

        const conversation =
          conversationId ||
          (await getOrCreateConversationByUsers(senderId, receiverId))._id;

        const message = await Message.create({
          conversationId: conversation,
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
