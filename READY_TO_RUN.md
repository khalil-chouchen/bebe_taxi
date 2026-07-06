# Bebe Taxi — Ready to Run

## Requirements

| Requirement | Version |
|---|---|
| Node.js | 20.x or 22.x LTS |
| npm | 10.x (comes with Node 20+) |
| MongoDB | Local 7.x **or** MongoDB Atlas |
| Expo Go on iPhone | Latest (from App Store) |

> Phone and laptop must be on the **same Wi-Fi network**.

---

## 1. Install dependencies

From the project root (`C:\Users\khali\Desktop\bebe_taxi`):

```powershell
npm install
```

If peer-dep conflicts appear:
```powershell
npm install --legacy-peer-deps
```

---

## 2. Configure the backend

Edit `apps/backend/.env` if needed (defaults work for local MongoDB):

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/bebe_taxi
JWT_SECRET=bebe_taxi_dev_secret_change_in_production
DEV_MODE=true          # OTP is always 123456 — no real WhatsApp calls
```

---

## 3. Run the backend

```powershell
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

---

## 4. Run the mobile app

Open a **second** terminal in the project root:

```powershell
npm run mobile
```

The `prestart` script auto-detects your LAN IP and writes it to `apps/mobile/.env`.
Scan the QR code in Expo Go on your iPhone.

---

## OTP Dev Code

When `DEV_MODE=true` in `apps/backend/.env`:

```
OTP code: 123456
```

No real WhatsApp messages are sent.

---

## Useful scripts

| Command | What it does |
|---|---|
| `npm run backend` | Start backend in dev mode |
| `npm run mobile` | Start Expo dev server |
| `npm run typecheck` | TypeScript check both apps |
| `npm run doctor` | Run `expo-doctor` on the mobile app |
| `npm run clean` | Delete all node_modules and build artifacts |

---

## Troubleshooting — Expo Go

### `PlatformConstants` could not be found
**Cause:** Expo Go on your iPhone is out of date, or React/React Native version mismatch.  
**Fix:**
1. Update Expo Go from the App Store to the latest version.
2. From project root, delete old modules and reinstall:
   ```powershell
   npm run clean
   npm install
   ```
3. From `apps/mobile`, let Expo fix package versions:
   ```powershell
   cd apps/mobile
   npx expo install --fix
   cd ../..
   npm install
   ```

### Red underline on `"extends": "expo/tsconfig.base"` in VS Code
**Cause:** `node_modules` not yet installed (or stale).  
**Fix:** Run `npm install` from the root.

### `update-env-ip` fails — no LAN IP detected
**Cause:** PC is not connected to Wi-Fi or Ethernet.  
**Fix:** Connect to your home/office network, then `npm run mobile` again.

### App connects to wrong backend IP
The `prestart` script writes the IP automatically. If wrong, edit `apps/mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3001/api
EXPO_PUBLIC_SOCKET_URL=http://YOUR_LAN_IP:3001
```
Find your LAN IP with: `ipconfig` (look for `IPv4 Address` under your Wi-Fi adapter).

---

## Troubleshooting — MongoDB

### Backend throws `MONGODB_URI not defined`
Ensure `apps/backend/.env` exists and contains `MONGODB_URI=...`.

### `MongoNetworkError` / cannot connect
- Make sure MongoDB is running:
  ```powershell
  # If using local MongoDB
  net start MongoDB
  # or
  mongod --dbpath C:\data\db
  ```
- Or switch to MongoDB Atlas: update `MONGODB_URI` in `apps/backend/.env` with your Atlas connection string.

### `MongoServerError: Authentication failed`
Your Atlas connection string has wrong credentials. Re-copy it from the Atlas dashboard.

---

## Test Flow

Follow these steps to verify the full trip flow:

1. **Register client**
   - Open app → Select "Client" → Enter phone number → Register with name.

2. **Verify OTP**
   - Enter `123456` (DEV_MODE is on).

3. **Register taxi**
   - Open app on a second device (or browser simulator) → Select "Taxi" → Complete taxi registration form.

4. **Taxi goes online**
   - Taxi home screen → Toggle "Online" → Taxi appears on map.

5. **Client searches for taxi**
   - Client home screen → Press "Request Taxi" → Confirm pickup location.

6. **Taxi receives request**
   - Taxi receives notification of new request on the map.

7. **Taxi sends offer**
   - Taxi taps the request → "Send Offer" button.

8. **Client accepts offer**
   - Client sees the offer with ETA and taxi info → "Accept".

9. **Trip flow**
   - Taxi drives to client → Status updates to "Arriving" → "Arrived".
   - Client boards → Taxi marks "Trip Complete".
   - Client can leave a review.

---

## Architecture Reference

```
bebe_taxi/
├── apps/
│   ├── backend/          Next.js 14 + Socket.IO + Mongoose
│   │   ├── server.ts     Custom HTTP server (binds 0.0.0.0:3001)
│   │   └── src/
│   │       ├── app/api/  Next.js API routes (REST endpoints)
│   │       ├── sockets/  Socket.IO event handlers
│   │       ├── models/   Mongoose models
│   │       └── lib/      JWT, MongoDB connection
│   └── mobile/           Expo SDK 54 + React Native 0.81 + React 19
│       ├── App.tsx        Entry point
│       ├── metro.config.js Monorepo workspace resolution
│       └── src/
│           ├── screens/  All app screens
│           ├── navigation/ React Navigation stack/tabs
│           ├── services/  API client + Socket.IO client
│           ├── store/    Zustand auth store
│           └── config/   EXPO_PUBLIC_* env vars
└── packages/
    └── shared/           Types + constants shared by backend and mobile
```
