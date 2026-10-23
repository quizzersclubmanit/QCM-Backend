import express from 'express';
import fs from 'fs';
import pkg from 'whatsapp-web.js';
import QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';

const { Client, LocalAuth } = pkg;

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

// State variables
let lastQr = null;
let qrDataUrl = null;
let isReady = false;
let clientInfo = null;

// Determine Chrome/Chromium executable path across OS environments (Linux, Windows, macOS)
const candidatePaths = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const puppeteerOpts = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
  ],
};

const foundBrowser = candidatePaths.find(p => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

if (foundBrowser) {
  puppeteerOpts.executablePath = foundBrowser;
  console.log(`ℹ️ [WhatsApp Gateway] Using system browser: ${foundBrowser}`);
} else {
  console.log('ℹ️ [WhatsApp Gateway] No custom browser path detected; using default Puppeteer browser.');
}

console.log('🔄 [WhatsApp Gateway] Initializing WhatsApp Web Client with LocalAuth...');
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth',
  }),
  puppeteer: puppeteerOpts,
});

client.on('qr', async (qr) => {
  lastQr = qr;
  try {
    qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
  } catch (err) {
    console.error('Error generating QR DataURL:', err.message);
  }

  console.log('\n======================================================');
  console.log('📲 SCAN THIS QR CODE WITH WHATSAPP TO LINK YOUR PHONE');
  console.log('   (WhatsApp > Settings / 3-dots > Linked Devices)');
  console.log(`   OR OPEN IN BROWSER: http://localhost:${PORT}/qr`);
  console.log('======================================================\n');
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('🔐 [WhatsApp Gateway] Authenticated successfully!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ [WhatsApp Gateway] Authentication failure:', msg);
});

client.on('ready', () => {
  isReady = true;
  lastQr = null;
  clientInfo = client.info;
  const userPhone = (client.info && client.info.wid && client.info.wid.user) || 'Unknown';
  console.log('\n======================================================');
  console.log(`✅ [WhatsApp Gateway] READY AND CONNECTED!`);
  console.log(`📱 Linked Phone Number: +${userPhone}`);
  console.log(`🚀 Gateway is live on http://localhost:${PORT}`);
  console.log('======================================================\n');
});

client.on('disconnected', (reason) => {
  isReady = false;
  clientInfo = null;
  console.warn('⚠️ [WhatsApp Gateway] Client disconnected:', reason);
  console.log('🔄 Attempting reinitialization in 5 seconds...');
  setTimeout(() => client.initialize(), 5000);
});

client.initialize().catch((err) => {
  console.error('❌ Failed to initialize WhatsApp Client:', err.message);
});

// REST ENDPOINTS

// 1. Status
app.get('/status', (req, res) => {
  res.json({
    ready: isReady,
    status: isReady ? 'CONNECTED' : (lastQr ? 'QR_READY' : 'INITIALIZING'),
    user: clientInfo ? { phone: clientInfo.wid.user, pushname: clientInfo.pushname } : null,
    qrUrl: `http://localhost:${PORT}/qr`,
  });
});

// 2. Browser QR Code UI
app.get('/qr', (req, res) => {
  if (isReady) {
    const user = clientInfo ? clientInfo.wid.user : '';
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QCM WhatsApp Gateway - Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c1a12; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #13241b; border: 1px solid #1f3d2e; border-radius: 16px; padding: 36px 32px; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 13px; margin-bottom: 20px; }
            h1 { font-size: 24px; margin: 0 0 10px; color: #e2b755; }
            p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
            .phone-pill { background: rgba(0,0,0,0.3); border: 1px solid rgba(226, 183, 85, 0.3); color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 16px; font-family: monospace; font-weight: 700; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">● ACTIVE & CONNECTED</div>
            <h1>WhatsApp Gateway Live</h1>
            <p>Your WhatsApp session is authenticated and ready to dispatch Q-BIT '26 digital passes 24/7 with zero message limits.</p>
            <div class="phone-pill">+${user}</div>
          </div>
        </body>
      </html>
    `);
  }

  if (qrDataUrl) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Scan WhatsApp QR Code</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="refresh" content="10" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c1a12; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: #13241b; border: 1px solid #1f3d2e; border-radius: 16px; padding: 32px 28px; max-width: 440px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            .brand { color: #e2b755; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
            h1 { font-size: 22px; margin: 0 0 8px; color: #fff; }
            p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 20px; }
            .qr-wrapper { background: #ffffff; padding: 16px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.4); margin-bottom: 20px; }
            .qr-wrapper img { display: block; width: 250px; height: 250px; }
            .steps { text-align: left; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 14px 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6; }
            .steps strong { color: #e2b755; }
            .refresh-note { margin-top: 14px; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">Quizzers' Club MANIT</div>
            <h1>Link WhatsApp Session</h1>
            <p>Scan this QR code from WhatsApp on your phone to activate automated pass delivery.</p>
            
            <div class="qr-wrapper">
              <img src="${qrDataUrl}" alt="WhatsApp QR Code" />
            </div>

            <div class="steps">
              <strong>1.</strong> Open WhatsApp on your phone.<br/>
              <strong>2.</strong> Tap <strong>Settings</strong> (iOS) or <strong>⋮ (3-dots)</strong> (Android).<br/>
              <strong>3.</strong> Tap <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong>.<br/>
              <strong>4.</strong> Point your camera at this QR code.
            </div>
            <div class="refresh-note">Page auto-refreshes every 10s if QR updates.</div>
          </div>
        </body>
      </html>
    `);
  }

  // Initializing state
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Initializing WhatsApp...</title>
        <meta http-equiv="refresh" content="3" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0c1a12; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; }
          .card { background: #13241b; border: 1px solid #1f3d2e; border-radius: 16px; padding: 36px; max-width: 400px; }
          h2 { color: #e2b755; margin: 0 0 10px; }
          p { color: #94a3b8; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Starting WhatsApp Client...</h2>
          <p>Please wait 5-10 seconds for the QR code to generate. Page will refresh automatically.</p>
        </div>
      </body>
    </html>
  `);
});

// 3. Send Message API
app.post('/send', async (req, res) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ error: 'Missing required fields: to, message' });
  }

  if (!isReady) {
    return res.status(503).json({
      error: 'WhatsApp client is not ready yet. Please scan QR at http://localhost:' + PORT + '/qr',
      ready: false,
    });
  }

  try {
    const cleanPhone = to.replace(/\D/g, '').slice(-10);
    let chatId = `91${cleanPhone}@c.us`;

    // 1. Resolve registered number ID via whatsapp-web.js to fetch canonical JID/LID
    try {
      const numberDetails = await client.getNumberId(`91${cleanPhone}`);
      if (numberDetails && numberDetails._serialized) {
        chatId = numberDetails._serialized;
        console.log(`ℹ️ [WhatsApp Gateway] Resolved number ID: ${chatId}`);
      }
    } catch (lookupErr) {
      console.warn(`⚠️ [WhatsApp Gateway] Number resolution note: ${lookupErr.message}`);
    }

    console.log(`📤 [WhatsApp Gateway] Sending message to ${chatId}...`);

    // 2. Pre-initialize chat in WAWeb internal store to prevent "No LID for user" assertion failure
    try {
      if (client.pupPage && !client.pupPage.isClosed()) {
        await client.pupPage.evaluate(async (jid) => {
          try {
            const findChatModule = window.require ? window.require('WAWebFindChatAction') : null;
            if (findChatModule && findChatModule.findOrCreateLatestChat) {
              await findChatModule.findOrCreateLatestChat({ remote: jid });
            }
          } catch (_) {}
        }, chatId);
      }
    } catch (_) {}

    // 3. Dispatch message
    const sentMsg = await client.sendMessage(chatId, message);
    const msgId = (sentMsg && sentMsg.id && (sentMsg.id._serialized || sentMsg.id.id)) || 'SENT_OK';

    console.log(`✅ [WhatsApp Gateway] Message sent successfully! ID: ${msgId}`);
    return res.json({
      success: true,
      id: msgId,
      to: `+91${cleanPhone}`,
    });
  } catch (err) {
    console.error('❌ [WhatsApp Gateway] Error sending message:', err.message);
    return res.status(500).json({
      error: 'Failed to send WhatsApp message',
      details: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`📡 [WhatsApp Gateway Server] Listening on http://localhost:${PORT}`);
  console.log(`🌐 QR Code Page: http://localhost:${PORT}/qr`);
  console.log(`📊 Status Page: http://localhost:${PORT}/status`);
});
