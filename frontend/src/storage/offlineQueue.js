import AsyncStorage from "@react-native-async-storage/async-storage";

const getQueueKey = (userId, otherUserId) => `offline_queue_${userId}_${otherUserId}`;

export const getQueuedMessages = async (userId, otherUserId) => {
  const key = getQueueKey(userId, otherUserId);
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
};

export const enqueueMessage = async (userId, otherUserId, message) => {
  const key = getQueueKey(userId, otherUserId);
  const existing = await getQueuedMessages(userId, otherUserId);
  const updated = [...existing, message];
  await AsyncStorage.setItem(key, JSON.stringify(updated));
};

export const clearQueue = async (userId, otherUserId) => {
  const key = getQueueKey(userId, otherUserId);
  await AsyncStorage.removeItem(key);
};
