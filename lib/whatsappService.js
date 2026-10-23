import http from 'http';
import https from 'https';
import { generatePassToken } from './passSecurity.js';

/**
 * Automated WhatsApp Notification Service for Q-BIT '26
 *
 * Automatically dispatches official digital passes directly to team members
 * via WhatsApp. Supports Meta WhatsApp Cloud API, Twilio WhatsApp,
 * generic webhook gateways (UltraMsg, WATI, Interakt, Aisensy, Gupshup, Zapier/Make),
 * and local dev simulation fallback.
 */
class WhatsappService {
  /**
   * Build the official WhatsApp digital pass message
   */
  formatPassMessage(team, passUrl) {
    const passCode = team.registrationCode || 'CONFIRMED';
    const bookletUrl = 'https://drive.google.com/file/d/1VEjbkVDRFUO42aibk2DdbdnD2vLRiv-w/view?usp=sharing';

    const memberLines = (team.members || [])
      .map((m, i) => `  ${i + 1}. *${m.name}* (+91 ${m.phone}) - ${m.course}`)
      .join('\n');

    return (
      `🎟️ *Q-BIT '26 OFFICIAL DIGITAL PASS*\n` +
      `*Quizzers' Club NIT Bhopal (MANIT)*\n\n` +
      `Hello Team *${team.teamName}*! Your registration for *Q-BIT '26* is officially confirmed.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📋 *ENTRY CREDENTIALS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Pass Code:* ${passCode}\n` +
      `• *Team:* ${team.teamName}\n` +
      `• *Institution:* ${team.college}\n` +
      `• *Date:* Saturday, 31 OCT 2026\n` +
      `• *Venue:* MANIT Bhopal Campus\n` +
      `• *Prize Pool:* ₹35,000\n\n` +
      `📱 *YOUR LIVE DIGITAL PASS & QR CODE:*\n` +
      `${passUrl}\n\n` +
      `👥 *REGISTERED TEAM ROSTER (4 MEMBERS):*\n` +
      `${memberLines}\n\n` +
      `📘 *OFFICIAL SAMPLE BOOKLET (PDF):*\n` +
      `${bookletUrl}\n\n` +
      `📌 *Check-In Instructions:*\n` +
      `This pass is 100% paperless. Simply present your pass code or live QR code on your phone at the check-in desk at MANIT Bhopal. Please carry your college ID cards.\n\n` +
      `_Quizzers' Club NIT Bhopal · www.quizzersclub.com_`
    );
  }

  /**
   * Send the registration pass automatically via WhatsApp
   *
   * @param {Object} team - Registered team object
   * @returns {Promise<Object>}
   */
  async sendQbitRegistrationWhatsApp(team) {
    const contact = team.members && team.members[0];
    if (!contact || !contact.phone) {
      console.warn('⚠️ [WhatsApp] No primary contact phone found for WhatsApp dispatch');
      return { success: false, reason: 'No phone number' };
    }

    const cleanPhone = contact.phone.replace(/\D/g, '').slice(-10);
    const passCode = team.registrationCode || 'CONFIRMED';
    const passToken = generatePassToken(passCode);
    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.quizzersclub.com').replace(/\/$/, '');
    const passUrl = `${frontendUrl}/pass?code=${encodeURIComponent(passCode)}&token=${passToken}`;
    const message = this.formatPassMessage(team, passUrl);

    console.log(`📲 [WHATSAPP SERVICE] Automatically sending digital pass to +91 ${cleanPhone} (Team: ${team.teamName})...`);

    // 0. Local WhatsApp Session Gateway (Port 3005 - 100% Free Forever, Unlimited Chats)
    const localGatewayPort = process.env.LOCAL_WHATSAPP_PORT || 3005;
    try {
      const localPostData = JSON.stringify({
        to: cleanPhone,
        message: message,
      });

      const localReq = await new Promise((resolve) => {
        const req = http.request(
          `http://localhost:${localGatewayPort}/send`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(localPostData),
            },
            timeout: 3000,
          },
          (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ success: true, body });
              } else {
                resolve({ success: false, body });
              }
            });
          }
        );
        req.on('error', () => resolve({ success: false }));
        req.on('timeout', () => {
          req.destroy();
          resolve({ success: false });
        });
        req.write(localPostData);
        req.end();
      });

      if (localReq && localReq.success) {
        console.log(`✅ [Local WhatsApp Gateway] Dispatched to +91 ${cleanPhone}`);
        return { success: true, provider: 'LocalWhatsAppGateway', recipient: `+91${cleanPhone}` };
      }
    } catch (err) {
      // Local gateway not active, fallback to cloud providers
    }

    // 0A. Green-API WhatsApp Gateway (Permanent Free Developer Tier - No Expiration)
    const greenApiInstance = process.env.GREEN_API_ID_INSTANCE || process.env.GREEN_API_INSTANCE_ID;
    const greenApiToken = process.env.GREEN_API_TOKEN_INSTANCE || process.env.GREEN_API_TOKEN;
    if (greenApiInstance && greenApiToken) {
      try {
        const payload = JSON.stringify({
          chatId: `91${cleanPhone}@c.us`,
          message: message,
        });

        const req = https.request(
          `https://api.green-api.com/waInstance${greenApiInstance}/sendMessage/${greenApiToken}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              console.log(`✅ [Green-API WhatsApp] Dispatched to +91 ${cleanPhone}. Response: ${data}`);
            });
          }
        );
        req.on('error', (err) => console.error('Green-API request error:', err.message));
        req.write(payload);
        req.end();

        return { success: true, provider: 'GreenAPI', recipient: `+91${cleanPhone}` };
      } catch (err) {
        console.error('Green-API WhatsApp dispatch error:', err.message);
      }
    }

    // 0B. Wassenger WhatsApp Gateway (7-Day Free Trial)
    const wassengerToken = process.env.WASSENGER_TOKEN;
    if (wassengerToken) {
      try {
        const payload = JSON.stringify({
          phone: `+91${cleanPhone}`,
          message: message,
        });

        const req = https.request(
          'https://api.wassenger.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Token: wassengerToken,
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              console.log(`✅ [Wassenger WhatsApp] Dispatched to +91 ${cleanPhone}. Response: ${data}`);
            });
          }
        );
        req.on('error', (err) => console.error('Wassenger request error:', err.message));
        req.write(payload);
        req.end();

        return { success: true, provider: 'Wassenger', recipient: `+91${cleanPhone}` };
      } catch (err) {
        console.error('Wassenger WhatsApp dispatch error:', err.message);
      }
    }

    // 0C. UltraMsg WhatsApp Gateway (Direct QR-linked WhatsApp)
    const ultramsgInstance = process.env.ULTRAMSG_INSTANCE_ID || 'instance195144';
    const ultramsgToken = process.env.ULTRAMSG_TOKEN || 'rb87j4gn8u9vqwu7';
    if (ultramsgInstance && ultramsgToken) {
      try {
        const postData = new URLSearchParams({
          token: ultramsgToken,
          to: `+91${cleanPhone}`,
          body: message,
        }).toString();

        const req = https.request(
          `https://api.ultramsg.com/${ultramsgInstance}/messages/chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              console.log(`✅ [UltraMsg WhatsApp] Dispatched to +91 ${cleanPhone}. Response: ${data}`);
            });
          }
        );
        req.on('error', (err) => console.error('UltraMsg request error:', err.message));
        req.write(postData);
        req.end();

        return { success: true, provider: 'UltraMsg', recipient: `+91${cleanPhone}` };
      } catch (err) {
        console.error('UltraMsg WhatsApp dispatch error:', err.message);
      }
    }

    // 1. Meta / WhatsApp Cloud API (Official Direct Graph API)
    if (process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      try {
        const payload = JSON.stringify({
          messaging_product: 'whatsapp',
          to: `91${cleanPhone}`,
          type: 'text',
          text: {
            preview_url: true,
            body: message,
          },
        });

        const req = https.request(
          `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              console.log(`✅ [Meta WhatsApp API] Response: ${res.statusCode}`);
            });
          }
        );
        req.on('error', (err) => console.error('Meta WhatsApp request error:', err.message));
        req.write(payload);
        req.end();

        return { success: true, provider: 'MetaWhatsAppCloudAPI' };
      } catch (err) {
        console.error('Meta WhatsApp Cloud dispatch error:', err.message);
      }
    }

    // 2. Twilio WhatsApp API
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      try {
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64');

        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
        const postData = new URLSearchParams({
          To: `whatsapp:+91${cleanPhone}`,
          From: fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`,
          Body: message,
        }).toString();

        const req = https.request(
          `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
              console.log(`✅ [Twilio WhatsApp] Response: ${res.statusCode}`);
            });
          }
        );
        req.on('error', (err) => console.error('Twilio WhatsApp error:', err.message));
        req.write(postData);
        req.end();

        return { success: true, provider: 'TwilioWhatsApp' };
      } catch (err) {
        console.error('Twilio WhatsApp dispatch error:', err.message);
      }
    }

    // 3. Generic WhatsApp Webhook Gateway (WATI, Interakt, Aisensy, UltraMsg, Zapier, Make)
    if (process.env.WHATSAPP_WEBHOOK_URL || process.env.NOTIFICATION_WEBHOOK_URL) {
      const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || process.env.NOTIFICATION_WEBHOOK_URL;
      try {
        const payload = JSON.stringify({
          channel: 'whatsapp',
          event: 'qbit_registration_whatsapp',
          recipient: `+91${cleanPhone}`,
          phone: cleanPhone,
          teamName: team.teamName,
          passCode: passCode,
          passUrl: passUrl,
          message: message,
          members: team.members || [],
          timestamp: new Date().toISOString(),
        });

        const urlObj = new URL(webhookUrl);
        const req = https.request(
          urlObj,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            console.log(`✅ [WhatsApp Webhook] Response: ${res.statusCode}`);
          }
        );
        req.on('error', (err) => console.error('WhatsApp Webhook error:', err.message));
        req.write(payload);
        req.end();

        return { success: true, provider: 'WhatsAppWebhook' };
      } catch (err) {
        console.error('WhatsApp Webhook dispatch error:', err.message);
      }
    }

    // 4. Automated Development Simulation / Local Fallback Log
    console.log(`📲 [AUTOMATED WHATSAPP NOTIFICATION DISPATCHED]`);
    console.log(`   To: +91 ${cleanPhone} (Team: ${team.teamName})`);
    console.log(`   Pass URL: ${passUrl}`);
    console.log(`   Message Preview:\n${message}`);
    console.log(
      `   💡 (Tip: Configure WHATSAPP_TOKEN & WHATSAPP_PHONE_NUMBER_ID, TWILIO_WHATSAPP_*, or WHATSAPP_WEBHOOK_URL in .env to deliver via live WhatsApp network)`
    );

    return { success: true, provider: 'DevLog' };
  }
}

const whatsappService = new WhatsappService();
export default whatsappService;
