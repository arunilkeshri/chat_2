import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { getMessages, getOrCreateConversation } from "../services/api";
import { connectSocket, getSocket } from "../services/socket";
import { clearQueue, enqueueMessage, getQueuedMessages } from "../storage/offlineQueue";

const byTimestamp = (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();

const createLocalMessage = ({ senderId, receiverId, text }) => ({
  _id: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  senderId,
  receiverId,
  text,
  timestamp: new Date().toISOString(),
  pending: true,
});

export default function ChatScreen({ currentUser, otherUser, onBack }) {
  const [conversationId, setConversationId] = useState(null);
  const conversationIdRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const listRef = useRef(null);

  const userPairKey = useMemo(
    () => `${currentUser.userId}_${otherUser.userId}`,
    [currentUser.userId, otherUser.userId]
  );

  const upsertMessage = useCallback((message) => {
    setMessages((prev) => {
      const exists = prev.find((item) => item._id === message._id);
      if (exists) {
        return prev.map((item) => (item._id === message._id ? message : item)).sort(byTimestamp);
      }
      return [...prev, message].sort(byTimestamp);
    });
  }, []);

  const replacePending = useCallback((savedMessage) => {
    if (!savedMessage.clientTempId) {
      upsertMessage({ ...savedMessage, pending: false });
      return;
    }

    setMessages((prev) => {
      const replaced = prev.map((msg) =>
        msg._id === savedMessage.clientTempId
          ? { ...savedMessage, pending: false }
          : msg
      );
      const foundByTempId = prev.some((msg) => msg._id === savedMessage.clientTempId);
      const foundById = prev.some((msg) => msg._id === savedMessage._id);
      if (!foundByTempId && !foundById) {
        return [...prev, { ...savedMessage, pending: false }].sort(byTimestamp);
      }
      return replaced.sort(byTimestamp);
    });
  }, [upsertMessage]);

  const sendMessageToSocket = useCallback(
    (text, tempId, timestamp) => {
      const socket = getSocket();
      if (!socket) return;

      socket.emit("sendMessage", {
        conversationId: conversationIdRef.current,
        senderId: currentUser.userId,
        receiverId: otherUser.userId,
        text,
        clientTempId: tempId,
        timestamp,
      });
    },
    [currentUser.userId, otherUser.userId]
  );

  const flushOfflineQueue = useCallback(async () => {
    if (!conversationId) return;
    const queued = await getQueuedMessages(currentUser.userId, otherUser.userId);
    if (!queued.length) return;

    for (const queuedMessage of queued) {
      sendMessageToSocket(queuedMessage.text, queuedMessage._id, queuedMessage.timestamp);
    }
    await clearQueue(currentUser.userId, otherUser.userId);
  }, [conversationId, currentUser.userId, otherUser.userId, sendMessageToSocket]);

  const loadConversationAndHistory = useCallback(async () => {
    setLoading(true);
    try {
      const conversation = await getOrCreateConversation(currentUser.userId, otherUser.userId);
      conversationIdRef.current = conversation._id;
      setConversationId(conversation._id);
      const history = await getMessages(conversation._id);
      setMessages(history.sort(byTimestamp));
    } catch (error) {
      console.log("Failed loading chat:", error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser.userId, otherUser.userId]);

  useEffect(() => {
    let mounted = true;
    const socket = connectSocket(currentUser.userId);

    const onReceive = (message) => {
      if (!mounted) return;
      if (
        String(message.senderId) === String(otherUser.userId) &&
        String(message.receiverId) === String(currentUser.userId)
      ) {
        upsertMessage(message);
      }
    };

    const onSaved = (message) => {
      if (!mounted) return;
      if (String(message.senderId) === String(currentUser.userId)) {
        replacePending(message);
      }
    };

    socket.on("receiveMessage", onReceive);
    socket.on("messageSaved", onSaved);

    loadConversationAndHistory();

    return () => {
      mounted = false;
      socket.off("receiveMessage", onReceive);
      socket.off("messageSaved", onSaved);
    };
  }, [currentUser.userId, loadConversationAndHistory, otherUser.userId, replacePending, upsertMessage]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online) {
        flushOfflineQueue();
      }
    });
    return unsubscribe;
  }, [flushOfflineQueue]);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages, userPairKey]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;

    const localMessage = createLocalMessage({
      senderId: currentUser.userId,
      receiverId: otherUser.userId,
      text,
    });

    setInput("");
    upsertMessage(localMessage);

    if (!isOnline) {
      await enqueueMessage(currentUser.userId, otherUser.userId, localMessage);
      return;
    }

    sendMessageToSocket(localMessage.text, localMessage._id, localMessage.timestamp);
  };

  const renderItem = ({ item }) => {
    const isMine = String(item.senderId) === String(currentUser.userId);

    return (
      <View style={[styles.messageRow, isMine ? styles.mineRow : styles.otherRow]}>
        <View style={[styles.bubble, isMine ? styles.mineBubble : styles.otherBubble]}>
          <Text style={[styles.messageText, isMine ? styles.mineText : styles.otherText]}>{item.text}</Text>
          <Text style={styles.metaText}>
            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {item.pending ? " • pending" : ""}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.chatHeaderCenter}>
          <Text style={styles.chatHeaderName}>{otherUser.name}</Text>
          <Text style={[styles.status, isOnline ? styles.online : styles.offline]}>
            {isOnline ? "Online" : "Offline (queued)"}
          </Text>
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={onSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  backButtonText: { fontSize: 15, color: "#111827", fontWeight: "600" },
  chatHeaderCenter: { flex: 1 },
  chatHeaderName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  status: { fontSize: 12, fontWeight: "600", marginTop: 1 },
  online: { color: "#16a34a" },
  offline: { color: "#dc2626" },
  list: { paddingHorizontal: 10, paddingVertical: 10, gap: 8 },
  messageRow: { width: "100%", marginBottom: 8 },
  mineRow: { alignItems: "flex-end" },
  otherRow: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mineBubble: { backgroundColor: "#2563eb" },
  otherBubble: { backgroundColor: "#e5e7eb" },
  messageText: { fontSize: 15 },
  mineText: { color: "white" },
  otherText: { color: "#111827" },
  metaText: { marginTop: 4, fontSize: 11, color: "#6b7280" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    backgroundColor: "#fff",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: "#fff",
  },
  sendButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendButtonText: { color: "#fff", fontWeight: "700" },
});
