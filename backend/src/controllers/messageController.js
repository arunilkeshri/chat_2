const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const getOrCreateConversation = async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({ message: "Both user IDs are required." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId1, userId2],
      });
    }

    return res.json(conversation);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMessagesByConversationId = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversationId" });
    }

    const messages = await Message.find({ conversationId }).sort({ timestamp: 1 });
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrCreateConversation,
  getMessagesByConversationId,
};
