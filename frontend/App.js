import React, { useEffect, useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ChatScreen from "./src/screens/ChatScreen";

const USER_STORAGE_KEY = "chat_current_user";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [chatPartner, setChatPartner] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_STORAGE_KEY).then((raw) => {
      if (raw) setCurrentUser(JSON.parse(raw));
      setReady(true);
    });
  }, []);

  const handleLogin = async (user) => {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setCurrentUser(null);
    setChatPartner(null);
  };

  if (!ready) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {!currentUser ? (
        <LoginScreen onLogin={handleLogin} />
      ) : !chatPartner ? (
        <HomeScreen
          currentUser={currentUser}
          onSelectPartner={setChatPartner}
          onLogout={handleLogout}
        />
      ) : (
        <ChatScreen
          currentUser={currentUser}
          otherUser={chatPartner}
          onBack={() => setChatPartner(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7" },
});
