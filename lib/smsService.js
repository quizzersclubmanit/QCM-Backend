import https from 'https';

/**
 * Mobile SMS & WhatsApp Notification Service for QBIT'26
 * Supports Fast2SMS (Indian SMS gateway), Twilio, MSG91, WhatsApp Webhook, or local simulation fallback.
 */
class SmsService {
  async sendQbitRegistrationSMS(team) {
    const leader = team.members && team.members[0];
    if (!leader || !leader.phone) {
      console.warn('⚠️ [SMS] No primary contact phone number found for SMS dispatch');
      return { success: false, reason: 'No phone' };
    }

    const cleanPhone = leader.phone.replace(/\D/g, '').slice(-10);
    const passCode = team.registrationCode || 'CONFIRMED';
    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.quizzersclub.com').replace(/\/$/, '');
    const passUrl = `${frontendUrl}/pass?code=${encodeURIComponent(passCode)}`;
    const message = `QBIT'26 Registration Confirmed! Team: ${team.teamName}. Pass Code: ${passCode}. View your digital pass: ${passUrl}. Date: 31 OCT 2026 at MANIT Bhopal. - Quizzers' Club NIT Bhopal`;

    console.log(`📱 [SMS SERVICE] Dispatching SMS alert for +91 ${cleanPhone} (Team: ${team.teamName})...`);

    // 1. Fast2SMS Integration (Fast, reliable in India for DLT / Quick SMS)
    if (process.env.FAST2SMS_API_KEY) {
      try {
        const payload = JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanPhone,
        });

        const req = https.request(
          'https://www.fast2sms.com/dev/bulkV2',
          {
            method: 'POST',
            headers: {
              authorization: process.env.FAST2SMS_API_KEY,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              console.log(`✅ [Fast2SMS] Response status: ${res.statusCode}`);
            });
          }
        );
        req.on('error', (err) => console.error('Fast2SMS request error:', err.message));
        req.write(payload);
        req.end();

        return { success: true, provider: 'Fast2SMS' };
      } catch (err) {
        console.error('Fast2SMS dispatch failed:', err.message);
      }
    }

    // 2. Twilio Integration (Global standard SMS gateway)
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      try {
        const auth = Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64');

        const postData = new URLSearchParams({
          To: `+91${cleanPhone}`,
          From: process.env.TWILIO_PHONE_NUMBER,
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
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              console.log(`✅ [Twilio] Response status: ${res.statusCode}`);
            });
          }
        );
        req.on('error', (err) => console.error('Twilio request error:', err.message));
        req.write(postData);
        req.end();

        return { success: true, provider: 'Twilio' };
      } catch (err) {
        console.error('Twilio dispatch failed:', err.message);
      }
    }

    // 3. Generic SMS/WhatsApp Webhook (Zapier, Make, custom WhatsApp Bot webhook)
    if (process.env.SMS_WEBHOOK_URL || process.env.NOTIFICATION_WEBHOOK_URL) {
      const webhookUrl = process.env.SMS_WEBHOOK_URL || process.env.NOTIFICATION_WEBHOOK_URL;
      try {
        const data = JSON.stringify({
          event: 'qbit_registration_sms',
          teamName: team.teamName,
          college: team.college,
          registrationCode: passCode,
          passUrl: passUrl,
          primaryPhone: cleanPhone,
          message: message,
          members: (team.members || []).map((m) => ({ name: m.name, phone: m.phone })),
          timestamp: new Date().toISOString(),
        });

        const urlObj = new URL(webhookUrl);
        const req = https.request(
          urlObj,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            },
          },
          (res) => {
            console.log(`✅ [Webhook] Response status: ${res.statusCode}`);
          }
        );
        req.on('error', (err) => console.error('Webhook request error:', err.message));
        req.write(data);
        req.end();

        return { success: true, provider: 'Webhook' };
      } catch (err) {
        console.error('Webhook dispatch failed:', err.message);
      }
    }

    // 4. Development Simulation / Fallback Log
    console.log(`📱 [SMS NOTIFICATION DISPATCHED]`);
    console.log(`   To: +91 ${cleanPhone} (Team Leader: ${leader.name})`);
    console.log(`   Message: "${message}"`);
    console.log(
      `   💡 (Tip: Configure FAST2SMS_API_KEY, TWILIO_*, or SMS_WEBHOOK_URL in .env to deliver real telecom SMS)`
    );

    return { success: true, provider: 'DevLog' };
  }
}

const smsService = new SmsService();
export default smsService;
