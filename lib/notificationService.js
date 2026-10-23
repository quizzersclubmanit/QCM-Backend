import emailService from './emailService.js';
import smsService from './smsService.js';
import whatsappService from './whatsappService.js';

/**
 * Orchestrates Email, WhatsApp, and Mobile SMS notifications for QBIT'26 registrations.
 * Dispatches asynchronously in best-effort mode so registration is never blocked.
 *
 * @param {Object} team - The registered team object from MongoDB / req.body
 * @returns {Promise<Object>} Results of email, whatsapp, and SMS dispatch
 */
export async function sendRegistrationNotifications(team) {
  if (!team) {
    console.warn('⚠️ [NotificationService] Empty team object received');
    return { email: null, whatsapp: null, sms: null };
  }

  console.log(`🚀 [NotificationService] Triggering automated notifications for team: "${team.teamName}" (Pass: ${team.registrationCode})...`);

  const results = {
    email: null,
    whatsapp: null,
    sms: null,
    timestamp: new Date().toISOString()
  };

  // 1. Dispatch Official Pass Email
  try {
    results.email = await emailService.sendQbitRegistrationEmail(team);
  } catch (err) {
    console.error(`❌ [NotificationService] Email dispatch failed for "${team.email}":`, err.message);
    results.email = { success: false, error: err.message };
  }

  // 2. Automated WhatsApp Digital Pass Dispatch
  try {
    results.whatsapp = await whatsappService.sendQbitRegistrationWhatsApp(team);
  } catch (err) {
    console.error(`❌ [NotificationService] WhatsApp dispatch failed for "${team.teamName}":`, err.message);
    results.whatsapp = { success: false, error: err.message };
  }

  // 3. Dispatch Mobile SMS alert to primary contact
  try {
    results.sms = await smsService.sendQbitRegistrationSMS(team);
  } catch (err) {
    console.error(`❌ [NotificationService] SMS dispatch failed for "${team.teamName}":`, err.message);
    results.sms = { success: false, error: err.message };
  }

  return results;
}

export default {
  sendRegistrationNotifications
};
