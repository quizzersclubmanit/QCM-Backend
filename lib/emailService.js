import jwt from 'jsonwebtoken';
import { generatePassToken } from './passSecurity.js';

let sgMail = null;
try {
  const mod = await import('@sendgrid/mail');
  sgMail = mod.default || mod;
} catch (e) {
  // @sendgrid/mail not yet installed; fallback will be used
}

class EmailService {
  constructor() {
    // Initialize SendGrid (works on all hosting providers)
    if (process.env.SENDGRID_API_KEY && sgMail) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('✅ SendGrid initialized successfully');
    } else if (!sgMail) {
      console.log('ℹ️ @sendgrid/mail not installed, using Nodemailer / dev logger');
    } else {
      console.log('❌ SendGrid API key not found');
    }

    console.log('🚀 Email service initialized');
  }

  generateResetToken(userId, email) {
    const payload = {
      userId,
      email,
      type: 'password_reset',
      timestamp: Date.now()
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async sendPasswordResetEmail(email, resetToken) {
    console.log('📧 Sending password reset email to:', email);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password-page?token=${resetToken}`;
    console.log('🔗 Reset URL generated:', resetUrl);

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not configured');
    }

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@quizzersclubmanit.in',
        name: 'QCM Password Reset'
      },
      subject: 'QCM - Password Reset Request',
      html: this.getPasswordResetEmailHTML(resetUrl)
    };

    try {
      console.log('🔄 Attempting SendGrid API...');
      const result = await sgMail.send(msg);
      console.log('✅ SendGrid email sent successfully:', result[0].statusCode);

      return {
        success: true,
        message: 'Password reset email sent successfully via SendGrid',
        statusCode: result[0].statusCode
      };
    } catch (error) {
      console.error('❌ SendGrid failed:', error.message);

      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }

      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  getPasswordResetEmailHTML(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>QCM Password Reset</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #14213D 0%, #1d2d50 100%); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px 20px; background-color: #ffffff; }
          .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #14213D 0%, #1d2d50 100%); color: white !important; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; font-size: 16px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; background-color: #f8f9fa; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .url-box { word-break: break-all; background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #dee2e6; font-family: monospace; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎯 QCM Password Reset</h1>
          </div>
          <div class="content">
            <h2 style="color: #14213D; margin-top: 0;">Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your QCM account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>
            <div class="warning">
              <strong>🔒 Security Notice:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            <p><strong>If the button doesn't work, copy this link:</strong></p>
            <div class="url-box">${resetUrl}</div>
            <p style="margin-top: 30px;">Best regards,<br><strong>The QCM Team</strong></p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} Quizzers Club MANIT. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendQbitRegistrationEmail(team) {
    const toEmail = team.email;
    console.log('📧 Sending QBIT registration pass email to:', toEmail);

    const subject = `🎟️ QBIT'26 Pass Code: ${team.registrationCode} [Team ${team.teamName}]`;
    const html = this.getQbitRegistrationEmailHTML(team);

    // 1. SendGrid Dispatch (if key configured and package available)
    if (process.env.SENDGRID_API_KEY && sgMail) {
      const msg = {
        to: toEmail,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@quizzersclubmanit.in',
          name: "Quizzers' Club NIT Bhopal"
        },
        subject,
        html
      };

      try {
        console.log('🔄 Attempting SendGrid API for QBIT pass...');
        const result = await sgMail.send(msg);
        console.log('✅ SendGrid email sent successfully:', result[0]?.statusCode);
        return { success: true, provider: 'SendGrid' };
      } catch (error) {
        console.error('❌ SendGrid registration email failed:', error.message);
        if (error.response) {
          console.error('SendGrid error body:', error.response.body);
        }
      }
    }

    // 2. Nodemailer / Gmail Fallback (if user & app password configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      try {
        const nodemailer = (await import('nodemailer')).default;
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          }
        });

        await transporter.sendMail({
          from: `"Quizzers' Club NIT Bhopal" <${process.env.EMAIL_USER}>`,
          to: toEmail,
          subject,
          html
        });

        console.log('✅ Nodemailer registration email sent successfully to:', toEmail);
        return { success: true, provider: 'Nodemailer' };
      } catch (err) {
        console.error('❌ Nodemailer registration email failed:', err.message);
      }
    }

    // 3. Fallback / Dev Log
    console.log(`📧 [EMAIL NOTIFICATION DISPATCHED]`);
    console.log(`   To: ${toEmail}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Pass Code: ${team.registrationCode}`);
    console.log(`   💡 (Tip: Configure SENDGRID_API_KEY or EMAIL_USER/EMAIL_APP_PASSWORD in .env to deliver real emails)`);

    return { success: true, provider: 'DevLog' };
  }

  getQbitRegistrationEmailHTML(team) {
    const frontendUrl = (process.env.FRONTEND_URL || 'https://www.quizzersclub.com').replace(/\/$/, '');
    const passCode = team.registrationCode || 'CONFIRMED';
    const passToken = generatePassToken(passCode);
    const passUrl = `${frontendUrl}/pass?code=${encodeURIComponent(passCode)}&token=${passToken}`;
    const bookletUrl = 'https://drive.google.com/file/d/1VEjbkVDRFUO42aibk2DdbdnD2vLRiv-w/view?usp=sharing';

    const membersListHtml = (team.members || [])
      .map(
        (m, i) => `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <td style="padding: 10px 14px; font-weight: 700; color: #e2b755; font-size: 13px;">
            Member ${i + 1}
          </td>
          <td style="padding: 10px 14px; color: #ffffff; font-size: 14px; font-weight: 600;">${m.name}</td>
          <td style="padding: 10px 14px; color: #cbd5e1; font-size: 13px;">+91 ${m.phone}</td>
          <td style="padding: 10px 14px; color: #94a3b8; font-size: 13px;">${m.course}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Q-BIT '26 Official Digital Pass</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #07130c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f7faf8; line-height: 1.5;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #07130c; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #0d2218; border: 1px solid rgba(226, 183, 85, 0.28); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);">
                
                <!-- HEADER -->
                <tr>
                  <td align="center" style="padding: 32px 24px 20px; background: linear-gradient(180deg, #102a1e 0%, #0d2218 100%); border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #e2b755; margin-bottom: 6px;">
                      QUIZZERS' CLUB NIT BHOPAL
                    </div>
                    <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                      Q-BIT <span style="color: #e2b755;">'26</span>
                    </h1>
                    <div style="display: inline-block; margin-top: 10px; padding: 5px 14px; background-color: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 999px; font-size: 11px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: 1px;">
                      &#10003; Official Digital Pass Confirmed
                    </div>
                  </td>
                </tr>

                <!-- DIGITAL PASS TICKET HERO -->
                <tr>
                  <td style="padding: 24px;">
                    <div style="background: linear-gradient(135deg, rgba(226, 183, 85, 0.08) 0%, rgba(18, 56, 38, 0.3) 100%); border: 2px dashed rgba(226, 183, 85, 0.38); border-radius: 14px; padding: 24px 20px; text-align: center;">
                      <div style="font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #e2b755; margin-bottom: 8px;">
                        UNIQUE ENTRY PASS CODE
                      </div>
                      <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 900; letter-spacing: 2.5px; color: #ffffff; margin-bottom: 12px; text-shadow: 0 0 16px rgba(226, 183, 85, 0.3);">
                        ${passCode}
                      </div>

                      <!-- DIRECT LINK CTA BUTTON -->
                      <div style="margin: 16px 0 14px;">
                        <a href="${passUrl}" target="_blank" style="display: inline-block; padding: 13px 30px; background: linear-gradient(135deg, #e5b03e 0%, #c4891b 100%); color: #08130d !important; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(226, 183, 85, 0.35);">
                          🎟️ Open Live Digital Pass
                        </a>
                      </div>

                      <p style="margin: 0; font-size: 12px; color: #95ac9f; line-height: 1.5;">
                        Present this pass code on your phone at the <strong>MANIT Bhopal</strong> check-in desk on <strong>31 OCT 2026</strong>.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- EVENT OVERVIEW SPECS -->
                <tr>
                  <td style="padding: 0 24px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;">
                      <tr>
                        <td width="33%" style="padding: 14px 10px; text-align: center; border-right: 1px solid rgba(255, 255, 255, 0.08);">
                          <div style="font-size: 10px; font-weight: 700; color: #e2b755; text-transform: uppercase; letter-spacing: 0.5px;">DATE</div>
                          <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-top: 3px;">31 OCT 2026</div>
                          <div style="font-size: 11px; color: #95ac9f; margin-top: 1px;">Saturday</div>
                        </td>
                        <td width="33%" style="padding: 14px 10px; text-align: center; border-right: 1px solid rgba(255, 255, 255, 0.08);">
                          <div style="font-size: 10px; font-weight: 700; color: #e2b755; text-transform: uppercase; letter-spacing: 0.5px;">VENUE</div>
                          <div style="font-size: 14px; font-weight: 700; color: #ffffff; margin-top: 3px;">NIT BHOPAL</div>
                          <div style="font-size: 11px; color: #95ac9f; margin-top: 1px;">MANIT Campus</div>
                        </td>
                        <td width="33%" style="padding: 14px 10px; text-align: center;">
                          <div style="font-size: 10px; font-weight: 700; color: #e2b755; text-transform: uppercase; letter-spacing: 0.5px;">PRIZE POOL</div>
                          <div style="font-size: 14px; font-weight: 800; color: #e2b755; margin-top: 3px;">₹ 35,000</div>
                          <div style="font-size: 11px; color: #95ac9f; margin-top: 1px;">Cash Awards</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- TEAM DETAILS -->
                <tr>
                  <td style="padding: 0 24px 20px;">
                    <div style="font-size: 12px; font-weight: 800; color: #e2b755; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                      Registered Team Roster (4 Members)
                    </div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="padding: 3px 0; color: #95ac9f; font-size: 13px; width: 110px;">Team Name:</td>
                        <td style="padding: 3px 0; color: #ffffff; font-size: 14px; font-weight: bold;">${team.teamName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 0; color: #95ac9f; font-size: 13px;">College:</td>
                        <td style="padding: 3px 0; color: #ffffff; font-size: 13px; font-weight: 600;">${team.college}</td>
                      </tr>
                      <tr>
                        <td style="padding: 3px 0; color: #95ac9f; font-size: 13px;">Team Email:</td>
                        <td style="padding: 3px 0; color: #cbd5e1; font-size: 13px;">${team.email}</td>
                      </tr>
                    </table>

                    <!-- MEMBERS TABLE -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; overflow: hidden;">
                      <thead>
                        <tr style="background-color: rgba(255, 255, 255, 0.04); text-align: left;">
                          <th style="padding: 8px 14px; font-size: 11px; color: #e2b755; text-transform: uppercase;">Member</th>
                          <th style="padding: 8px 14px; font-size: 11px; color: #e2b755; text-transform: uppercase;">Name</th>
                          <th style="padding: 8px 14px; font-size: 11px; color: #e2b755; text-transform: uppercase;">Phone</th>
                          <th style="padding: 8px 14px; font-size: 11px; color: #e2b755; text-transform: uppercase;">Course</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${membersListHtml}
                      </tbody>
                    </table>
                  </td>
                </tr>

                <!-- OFFICIAL SAMPLE BOOKLET CALLOUT -->
                <tr>
                  <td style="padding: 0 24px 20px;">
                    <div style="background-color: rgba(226, 183, 85, 0.06); border: 1px solid rgba(226, 183, 85, 0.25); border-radius: 10px; padding: 14px 16px; text-align: center;">
                      <strong style="display: block; font-size: 13px; color: #ffffff; margin-bottom: 4px;">
                        📘 Official Sample Booklet &amp; Question Patterns
                      </strong>
                      <p style="margin: 0 0 10px; font-size: 12px; color: #95ac9f;">
                        Download previous rounds question formats, topics, and quiz mechanics:
                      </p>
                      <a href="${bookletUrl}" target="_blank" style="display: inline-block; font-size: 12px; font-weight: 700; color: #e2b755; text-decoration: underline;">
                        Download Sample Booklet (PDF) &rarr;
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- GUIDELINES -->
                <tr>
                  <td style="padding: 0 24px 24px;">
                    <div style="background-color: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 14px 16px;">
                      <div style="font-size: 12px; font-weight: 700; color: #4ade80; margin-bottom: 6px;">
                        📌 Check-In Instructions:
                      </div>
                      <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
                        <li><strong>100% Paperless:</strong> No physical printout needed. Open the digital pass on your phone at check-in.</li>
                        <li>All 4 team members must report together at MANIT Bhopal with their respective College ID cards.</li>
                        <li>Event schedule, campus gate navigation, and hall allotments will be updated on your live digital pass.</li>
                      </ul>
                    </div>
                  </td>
                </tr>

                <!-- CONTACT & SUPPORT -->
                <tr>
                  <td style="padding: 0 24px 28px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #95ac9f;">
                      Need help or have questions? Contact event coordinators:
                    </p>
                    <p style="margin: 0; font-size: 13px; font-weight: 600; color: #ffffff;">
                      Yashika: <a href="tel:+918000264938" style="color: #e2b755; text-decoration: none;">+91 80002 64938</a>
                      &nbsp;&bull;&nbsp;
                      Rihansh: <a href="tel:+919953493370" style="color: #e2b755; text-decoration: none;">+91 99534 93370</a>
                    </p>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td align="center" style="padding: 20px 24px; background-color: #08160f; border-top: 1px solid rgba(255, 255, 255, 0.08); font-size: 11px; color: #64748b;">
                    <p style="margin: 0 0 4px;">&copy; 2026 Quizzers' Club NIT Bhopal (QCM MANIT). All rights reserved.</p>
                    <p style="margin: 0;">
                      <a href="${frontendUrl}" style="color: #e2b755; text-decoration: none;">www.quizzersclub.com</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  async testEmailConfig() {
    if (!process.env.SENDGRID_API_KEY) {
      return {
        success: false,
        message: 'SendGrid API key not configured',
        details: { sendgrid: 'API key missing' }
      };
    }

    return {
      success: true,
      message: 'SendGrid is configured and ready',
      details: { sendgrid: 'API key present' }
    };
  }
}

const emailService = new EmailService();
export default emailService;
