const express = require("express");
const {
  getOrCreateConversation,
  getMessagesByConversationId,
} = require("../controllers/messageController");

const router = express.Router();

router.post("/conversations/get-or-create", getOrCreateConversation);
router.get("/messages/:conversationId", getMessagesByConversationId);

module.exports = router;
