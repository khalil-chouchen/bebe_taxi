# 🚖 Bebe Taxi

A real-time taxi booking MVP: clients request a ride, nearby drivers see it live on the map, send offers, and the trip is tracked in real time until drop-off — all built to run on a physical phone via **Expo Go**, no native build required.

---

## Features

- **Phone + OTP authentication** (WhatsApp OTP in production, mock code in dev mode)
- **Live map** for both client and taxi roles (pickup/destination selection, nearby drivers/requests)
- **Real-time request → offer → accept flow** over Socket.IO (no polling)
- **Live location tracking** during an active trip (client ↔ taxi)
- **Route directions** with Google Maps / OSRM fallback / straight-line fallback, so the app keeps working even without a Maps API key
- **Trip lifecycle**: request, offer, accept, arriving, arrived, complete, review
- **WhatsApp deep link** to call/message the other party mid-trip
- Works in plain **Expo Go** on iOS and Android — no EAS build needed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native · Expo SDK 54 · TypeScript |
| Navigation | React Navigation v7 |
| Maps | react-native-maps (Apple Maps / Google Maps) + OSRM/straight-line fallback |
| Location | expo-location |
| Storage | expo-secure-store |
| State | Zustand |
| HTTP | Axios |
| Real-time | Socket.IO client |
| Backend | Next.js 14 (custom server) · TypeScript |
| Database | MongoDB · Mongoose |
| Auth | JWT · bcryptjs |
| Real-time server | Socket.IO |
| OTP | WhatsApp (Meta Cloud API / Twilio), or mock in `DEV_MODE` |

---

## Project Structure

```
bebe-taxi/
├── apps/
│   ├── backend/          Next.js 14 + Socket.IO + MongoDB
│   │   ├── server.ts     Custom HTTP server (binds Socket.IO to the same port)
│   │   └── src/
│   │       ├── app/api/  REST endpoints
│   │       ├── sockets/  Socket.IO event handlers
│   │       ├── models/   Mongoose models
│   │       ├── services/ Maps/geocoding service
│   │       └── lib/      JWT, MongoDB connection
│   └── mobile/           Expo SDK 54 React Native app
│       ├── App.tsx        Entry point
│       ├── metro.config.js Monorepo module resolution
│       └── src/
│           ├── screens/   All app screens (+ .web.tsx variants for browser preview)
│           ├── navigation/ React Navigation stacks
│           ├── services/  API client, Socket.IO client, maps/location services
│           ├── store/     Zustand auth store
│           └── config/    EXPO_PUBLIC_* env vars
└── packages/
    └── shared/            TypeScript types & constants shared by both apps
```

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20.x or 22.x LTS |
| npm | 10.x |
| MongoDB | 7.x local, or MongoDB Atlas |
| Expo Go | Latest (App Store / Play Store) |

> Your phone and computer must be on the **same Wi-Fi network** — Expo Go on a physical device needs to reach your computer's backend over LAN.

---

## Installation

```bash
git clone <repo-url>
cd bebe-taxi
npm install
```

This installs all three workspaces (`apps/backend`, `apps/mobile`, `packages/shared`) in one step via npm workspaces.

If you hit peer-dependency conflicts:
```bash
npm install --legacy-peer-deps
```

---

## Environment Variables

Copy the example files and fill in your own values:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/mobile/.env.example apps/mobile/.env
```

### `apps/backend/.env`

| Variable | Purpose | Dev default |
|---|---|---|
| `PORT` | Backend port | `3001` |
| `HOST` | Bind address (`0.0.0.0` so your phone can reach it over LAN) | `0.0.0.0` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/bebe_taxi` |
| `JWT_SECRET` | Signing secret for auth tokens — **must be changed for any real deployment** | placeholder |
| `DEV_MODE` | `true` → OTP is always `123456`, no WhatsApp calls made | `true` |
| `META_WHATSAPP_TOKEN` / `META_WHATSAPP_PHONE_ID` | Meta WhatsApp Cloud API creds (only used if `DEV_MODE=false`) | empty |
| `WHATSAPP_PROVIDER` | `meta` or `twilio` | `meta` |
| `TWILIO_*` | Twilio WhatsApp alternative creds | empty |
| `GOOGLE_MAPS_API_KEY` | Enables real geocoding/directions; leave empty to use the OSRM/straight-line fallback | empty |
| `MAPS_PROVIDER` | `google` | `google` |
| `ENABLE_MAPS_FALLBACK` | Falls back to OSRM/straight-line if Google key is missing or the API fails | `true` |
| `CORS_ORIGIN` | Allowed origin(s) for the REST API (needed for the web/browser build) | `*` |

### `apps/mobile/.env`

All variables **must** be prefixed `EXPO_PUBLIC_` to be readable in the app. `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_SOCKET_URL` are auto-written by the `prestart` script (see below) — you normally don't need to edit them by hand.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Backend REST base URL, auto-set to your LAN IP |
| `EXPO_PUBLIC_SOCKET_URL` | Backend Socket.IO URL, auto-set to your LAN IP |
| `EXPO_PUBLIC_MAPS_PROVIDER` | `default` (Apple Maps on iOS / default Android provider) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional, only needed if you explicitly want Google Maps rendering in a dev build (not Expo Go) |

**No real secrets belong in `apps/mobile/.env`** — it is bundled into the client app and is not private.

---

## Running the Backend

```bash
npm run backend
```

Expected output:
```
🚖  Bebe Taxi backend ready
   Backend running locally : http://localhost:3001
   Backend running on LAN  : http://192.168.x.x:3001
   Socket.IO attached
   DEV_MODE OTP: ON (use code 123456)
```

Make sure MongoDB is running locally, or that `MONGODB_URI` points to an Atlas cluster.

---

## Running the Mobile App

In a second terminal:

```bash
npm run mobile
```

The `prestart` script auto-detects your machine's LAN IP and writes it into `apps/mobile/.env` before Expo starts. Scan the QR code with **Expo Go** on your phone.

---

## OTP Dev Code

With `DEV_MODE=true` in `apps/backend/.env` (the default), the OTP is always:

```
123456
```

No real WhatsApp messages are sent, and the API response includes `devCode: "123456"` shown as an in-app toast.

---

## App Flows

### Client
1. Select role → Login/Register (phone + OTP)
2. See map with available taxis
3. Set pickup + destination → **Chercher Taxi**
4. Online taxis see the request in real time
5. Taxi sends an offer → client sees it live
6. Client accepts → all other offers auto-rejected
7. Live tracking of the accepted taxi's position
8. WhatsApp button to contact the driver
9. Taxi marks arrived → client notified
10. Client leaves a 1–5 star review

### Taxi Driver
1. Select role → Login/Register (phone + OTP + taxi details)
2. Toggle **online** → become visible to clients
3. See client requests on the map
4. Tap a request → bottom sheet with client info + ETA
5. **Envoyer une offre** → sent in real time
6. If accepted → navigate to the active pickup screen
7. Live tracking of the client's position
8. **Je suis arrivé !** → client notified
9. **Terminer le trajet** → taxi becomes available again

---

## API Reference

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

### Maps
| Method | Path | Auth |
|--------|------|------|
| GET | `/api/maps/geocode` | Public |
| GET | `/api/maps/reverse-geocode` | Public |
| GET | `/api/maps/directions` | Public |

---

## Socket.IO Events

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
| `taxi:goOnline` / `taxi:goOffline` | — |
| `taxi:sendOffer` | `{ requestId }` |
| `taxi:arrived` | — |
| `taxi:completeTrip` | — |

### Server → Client/Taxi
| Event | Sent to |
|-------|---------|
| `request:new` | All online taxis |
| `request:cancelled` | All taxis |
| `offer:new` | Requesting client |
| `offer:accepted` / `offer:rejected` | Taxis |
| `trip:started` / `trip:locationUpdate` / `trip:arrived` / `trip:completed` | Client & taxi |

---

## Screenshots

> _Add screenshots or a short demo GIF here once available._

| Client | Taxi |
|---|---|
| _placeholder_ | _placeholder_ |

---

## Troubleshooting

For a full, step-by-step troubleshooting guide (Expo Go / Metro / MongoDB issues), see **[READY_TO_RUN.md](READY_TO_RUN.md)**.

Quick pointers:

| Symptom | Likely cause |
|---|---|
| `PlatformConstants could not be found` in Expo Go | React/React Native version mismatch — run `npm run clean && npm install` from the root |
| Blank screen, no error, on phone or in the browser | Full restart of `npm run mobile` + reload; if it persists, check `apps/mobile/App.tsx` still calls `registerRootComponent` |
| CORS error in the browser console | Backend `CORS_ORIGIN` not set, or `apps/backend/.env` malformed — restart `npm run backend` |
| App can't reach the backend from the phone | Confirm both devices are on the same Wi-Fi and re-run `npm run mobile` so the LAN IP in `apps/mobile/.env` refreshes |
| `MongoNetworkError` | MongoDB isn't running locally, or `MONGODB_URI` is wrong |

---

## Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `DEV_MODE=false`
- [ ] Configure real WhatsApp API credentials (Meta or Twilio)
- [ ] Use MongoDB Atlas (or a secured MongoDB instance)
- [ ] Deploy the backend to a cloud server (Railway, Render, VPS, …)
- [ ] Add a real `GOOGLE_MAPS_API_KEY` if you want live geocoding/directions
- [ ] Build the mobile app with `eas build` for the app stores
