# QCM WhatsApp Gateway

Self-hosted, cost-free WhatsApp Web Gateway for **Quizzers' Club MANIT (Q-BIT '26)** automated digital pass dispatch.

---

## 🚀 How to Run (Quick 3 Steps)

### 1. Install Dependencies
```bash
cd whatsapp-gateway
npm install
```

### 2. Start the Service
```bash
node server.js
```
*(Or keep running in background with PM2: `npx pm2 start server.js --name "qcm-whatsapp"`)*

### 3. Link WhatsApp Session
1. In your terminal or browser, open:
   ```
   http://localhost:3005/qr
   ```
   *(If running on a remote cloud VPS, access `http://<your-server-ip>:3005/qr`)*
2. Open WhatsApp on your club phone:
   - Go to **Settings** (iOS) or **⋮ (3 dots)** (Android)
   - Tap **Linked Devices** > **Link a Device**
   - Scan the QR code.
3. The session will save automatically in `.wwebjs_auth/` so you **only need to scan once**.

---

## ⚙️ Backend Integration

In your backend `.env` file (`QCM-Backend/.env`), specify the gateway address:

```env
WHATSAPP_GATEWAY_URL="http://localhost:3005"
```
*(If the gateway is hosted on a different VPS or domain, enter its public URL, e.g. `http://13.x.x.x:3005` or `https://wa.quizzersclubmanit.com`)*

---

## 📡 API Endpoints

- `GET /status` : Check if WhatsApp is authenticated & connected.
- `GET /qr` : Live browser UI to scan the QR code.
- `POST /send` : Send WhatsApp message (`{ "to": "9876543210", "message": "Hello" }`).
