# Real-Time One-to-One Chat (React Native + Node.js)

A simple end-to-end real-time chat application:

- **Backend**: Express + Socket.IO + MongoDB (Mongoose)
- **Frontend**: React Native (Expo) + Socket.IO client
- **Offline queue**: Messages queued in AsyncStorage and flushed on reconnect

## Project Structure

```
chat_2/
  backend/
    src/
      config/       # Database connection
      controllers/  # Request handlers
      models/       # Mongoose schemas
      routes/       # API routes
      socket/       # Socket.IO event handlers
      server.js
  frontend/
    src/
      screens/      # UI screens
      services/     # API and socket clients
      storage/      # Offline queue (AsyncStorage)
    App.js
```

## Backend Setup

```bash
cd backend
npm install
```

Edit `backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/chat_app
CORS_ORIGIN=*
```

```bash
npm run dev
```

Backend runs on `http://localhost:5000`.

## Frontend Setup

```bash
cd frontend
npm install
```

Update `frontend/src/services/config.js` with your machine's local IP:

```js
export const SERVER_URL = "http://192.168.x.x:5000";
```

```bash
npm start
```

Open **Expo Go** on your device or emulator and scan the QR code.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/conversations/get-or-create` | Get or create a conversation between two users |
| GET | `/api/messages/:conversationId` | Fetch messages for a conversation |

**POST body:** `{ "userId1": "...", "userId2": "..." }`

## Socket Events

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `register` | `userId` |
| Client → Server | `sendMessage` | `{ conversationId, senderId, receiverId, text, clientTempId, timestamp }` |
| Server → Client | `messageSaved` | Saved message (sent to sender) |
| Server → Client | `receiveMessage` | New message (sent to receiver) |
| Server → Client | `messageError` | Error details |

## Test Flow

1. Start backend and frontend.
2. Send a message as **User A**.
3. Press **Switch User** in the app header to become **User B**.
4. Reply as **User B** and verify the message appears for both users.
5. Disable internet, send a message — it will be queued.
6. Re-enable internet and verify the queued message is delivered automatically.

## MongoDB Schemas

| Model | Fields |
|-------|--------|
| `User` | `_id`, `name`, `createdAt` |
| `Conversation` | `_id`, `participants[]`, `createdAt` |
| `Message` | `_id`, `conversationId`, `senderId`, `receiverId`, `text`, `timestamp` |
