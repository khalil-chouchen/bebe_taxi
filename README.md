# 🚖 Bebe Taxi — Full-Stack MVP

A real-time taxi app built with **React Native (Expo SDK 54)** + **Next.js** + **Socket.IO** + **MongoDB**.

---

## Project Structure

```
bebe-taxi/
├── apps/
│   ├── backend/          # Next.js 14 + Socket.IO + MongoDB
│   └── mobile/           # Expo SDK 54 React Native app
└── packages/
    └── shared/           # Shared TypeScript types & constants
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| MongoDB | 6+ (local or Atlas) |
| Expo Go | Latest (iOS/Android) |

---

## 1. Clone & Install

```bash
git clone <repo-url>
cd bebe-taxi

# Install root workspace
npm install

# Install backend
cd apps/backend && npm install

# Install mobile
cd ../mobile && npm install
```

---

## 2. Backend Setup

### Environment Variables

Copy and edit `.env`:
```bash
cd apps/backend
cp .env.example .env
```

Edit `apps/backend/.env`:

```env
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/bebe_taxi

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=30d

# WhatsApp OTP
DEV_MODE=true        # ← keep true for local dev (mock OTP = 123456)

# Meta WhatsApp Cloud API (set DEV_MODE=false to use)
META_WHATSAPP_TOKEN=your_meta_token
META_WHATSAPP_PHONE_ID=your_phone_id

# OR Twilio (set WHATSAPP_PROVIDER=twilio)
WHATSAPP_PROVIDER=meta
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Google Maps (optional — enables real route polylines)
GOOGLE_MAPS_API_KEY=your_key_here

CORS_ORIGIN=*
```

### Run Backend

```bash
cd apps/backend
npm run dev
```

The server starts at `http://localhost:3001`.  
Socket.IO is attached on the same port.

---

## 3. Mobile Setup

### Configure API URL

Edit `apps/mobile/src/constants/index.ts`:

```ts
// Replace with your machine's LAN IP (not localhost — Expo Go runs on a real device)
export const API_BASE_URL = 'http://192.168.1.XXX:3001/api';
export const SOCKET_URL   = 'http://192.168.1.XXX:3001';
```

Find your LAN IP:
- **Windows**: `ipconfig` → look for IPv4 Address
- **Mac/Linux**: `ifconfig` or `ip addr`

### Add Google Maps Key (Android only)

Edit `apps/mobile/app.json`:
```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_GOOGLE_MAPS_API_KEY"
    }
  }
}
```

> **iOS** uses Apple Maps by default (no key needed in Expo Go).

### Run Mobile

```bash
cd apps/mobile
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

---

## 4. Dev OTP (DEV_MODE=true)

When `DEV_MODE=true` in the backend `.env`:

- The OTP code is always **`123456`**
- No WhatsApp messages are sent
- The API response includes `devCode: "123456"` — shown as a toast in the app

---

## 5. App Flows

### Client Flow
1. Select role → Login/Register (phone + OTP)
2. See map with available taxis
3. Press **"Chercher Taxi"** → creates a request
4. All online taxis see the client icon on their map
5. Taxi sends an offer → client sees offer list in real time
6. Client accepts one offer → all others rejected
7. Map shows only: client position + accepted taxi moving
8. WhatsApp button to call taxi
9. Taxi marks arrived → client notified
10. Client leaves a 1–5 star review

### Taxi Driver Flow
1. Select role → Login/Register (phone + OTP + taxi details)
2. Toggle **online** switch → become visible
3. See client request icons on map
4. Press a client icon → bottom sheet with name & ETA
5. Press **"Envoyer une offre"** → offer sent in real time
6. If client accepts → notified, navigate to ActivePickup screen
7. Map shows only: taxi position + client moving in real time
8. Press **"Je suis arrivé !"** → client notified
9. Press **"Terminer le trajet"** → taxi becomes available again

---

## 6. API Reference

### Auth
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/send-otp` | Public |
| POST | `/api/auth/verify-otp` | Public |
| POST | `/api/auth/register-client` | Public |
| POST | `/api/auth/register-taxi` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Bearer |

### Client
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/client/location` | Client |
| GET | `/api/client/available-taxis` | Client |
| POST | `/api/client/request-taxi` | Client |
| GET | `/api/client/offers/:requestId` | Client |
| POST | `/api/client/accept-offer` | Client |
| POST | `/api/client/review` | Client |

### Taxi
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/taxi/location` | Taxi |
| POST | `/api/taxi/online` | Taxi |
| GET | `/api/taxi/active-requests` | Taxi |
| POST | `/api/taxi/send-offer` | Taxi |
| POST | `/api/taxi/arrived` | Taxi |
| POST | `/api/taxi/complete-trip` | Taxi |

### Trip
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/trip/current` | Any |
| POST | `/api/trip/cancel` | Any |

---

## 7. Socket.IO Events

### Client → Server
| Event | Payload |
|-------|---------|
| `client:updateLocation` | `{ latitude, longitude }` |
| `client:acceptOffer` | `{ offerId, requestId }` |
| `client:cancelRequest` | `{ requestId }` |
| `client:completeTrip` | — |

### Taxi → Server
| Event | Payload |
|-------|---------|
| `taxi:updateLocation` | `{ latitude, longitude }` |
| `taxi:goOnline` | — |
| `taxi:goOffline` | — |
| `taxi:sendOffer` | `{ requestId }` |
| `taxi:arrived` | — |
| `taxi:completeTrip` | — |

### Server → Client/Taxi
| Event | Sent To |
|-------|---------|
| `request:new` | All online taxis |
| `request:cancelled` | All taxis |
| `offer:new` | Requesting client |
| `offer:accepted` | Accepted taxi |
| `offer:rejected` | Rejected taxis |
| `trip:started` | Client |
| `trip:locationUpdate` | Client (taxi moving) / Taxi (client) |
| `trip:arrived` | Client |
| `trip:completed` | Both |

---

## 8. Expo Go Limitations

| Feature | Status |
|---------|--------|
| react-native-maps | ✅ Works (Apple Maps on iOS, Google Maps on Android with key) |
| expo-location | ✅ Works |
| expo-secure-store | ✅ Works |
| expo-image-picker | ✅ Works |
| socket.io-client | ✅ Works |
| Background location | ❌ Requires EAS build — not used (we use foreground only) |
| Push notifications | ❌ Requires EAS build — replaced with in-app toast |
| Custom native modules | ❌ Not used |

> All real-time features use Socket.IO instead of push notifications to stay fully Expo Go compatible.

---

## 9. WhatsApp OTP — Production Setup

### Option A: Meta WhatsApp Cloud API

1. Create a Meta Developer account
2. Create a WhatsApp Business App
3. Get `Phone Number ID` and `Permanent Access Token`
4. Set in `.env`:
   ```env
   DEV_MODE=false
   WHATSAPP_PROVIDER=meta
   META_WHATSAPP_TOKEN=your_token
   META_WHATSAPP_PHONE_ID=your_phone_id
   ```

### Option B: Twilio WhatsApp

1. Create a Twilio account
2. Get a WhatsApp-enabled number (Sandbox or production)
3. Set in `.env`:
   ```env
   DEV_MODE=false
   WHATSAPP_PROVIDER=twilio
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

---

## 10. Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `DEV_MODE=false`
- [ ] Configure real WhatsApp API credentials
- [ ] Use MongoDB Atlas (or secured MongoDB)
- [ ] Deploy backend to a cloud server (Railway, Render, VPS)
- [ ] Update `API_BASE_URL` and `SOCKET_URL` in mobile constants
- [ ] Add Google Maps API key to `app.json`
- [ ] Build mobile with `eas build` for production stores

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Mobile | React Native · Expo SDK 54 · TypeScript |
| Navigation | React Navigation v7 |
| Maps | react-native-maps |
| Location | expo-location |
| Storage | expo-secure-store |
| State | Zustand |
| HTTP | Axios |
| Real-time | Socket.IO client |
| Backend | Next.js 14 · TypeScript |
| Database | MongoDB · Mongoose |
| Auth | JWT · bcryptjs |
| Real-time server | Socket.IO |
| OTP | WhatsApp (Meta API / Twilio) |
