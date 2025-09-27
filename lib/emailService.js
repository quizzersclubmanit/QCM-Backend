
// import nodemailer from 'nodemailer';
// import { Resend } from 'resend';
// import jwt from 'jsonwebtoken';

// class EmailService {
//   constructor() {
//     // Initialize Resend
//     this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    
//     // Initialize Gmail transporter as PRIMARY option (more reliable for all emails)
//     this.transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: process.env.SMTP_USER || process.env.EMAIL_USER,
//         pass: process.env.SMTP_PASS || process.env.EMAIL_APP_PASSWORD
//       },
//       connectionTimeout: 10000,
//       greetingTimeout: 5000,
//       socketTimeout: 10000,
//       tls: { rejectUnauthorized: false }
//     });

//     console.log('🚀 Email service initialized:', {
//       resend: this.resend ? 'Available (sandbox mode)' : 'Not configured',
//       gmail: (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) ? 'Available (production ready)' : 'Not configured'
//     });
//   }

//   generateResetToken(userId, email) {
//     const payload = {
//       userId,
//       email,
//       type: 'password_reset',
//       timestamp: Date.now()
//     };
//     return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
//   }

//   verifyResetToken(token) {
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       if (decoded.type !== 'password_reset') {
//         throw new Error('Invalid token type');
//       }
//       return decoded;
//     } catch (error) {
//       throw new Error('Invalid or expired token');
//     }
//   }

//   async sendPasswordResetEmail(email, resetToken) {
//     console.log('📧 Sending password reset email to:', email);
    
//     const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password-page?token=${resetToken}`;
//     console.log('🔗 Reset URL generated:', resetUrl);

//     // Try Gmail FIRST (works for ALL email addresses)
//     if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
//       console.log('🔄 Attempting Gmail SMTP (primary method)...');
      
//       const mailOptions = {
//         from: `"QCM Password Reset" <${process.env.EMAIL_USER}>`,
//         to: email,
//         subject: 'QCM - Password Reset Request',
//         html: this.getPasswordResetEmailHTML(resetUrl)
//       };

//       try {
//         const result = await Promise.race([
//           this.transporter.sendMail(mailOptions),
//           new Promise((_, reject) => 
//             setTimeout(() => reject(new Error('Gmail timeout')), 20000)
//           )
//         ]);
        
//         console.log('✅ Gmail email sent successfully:', result.messageId);
//         return { success: true, message: 'Password reset email sent successfully via Gmail' };
//       } catch (error) {
//         console.error('❌ Gmail failed:', error.message);
//         // Continue to Resend fallback only if Gmail fails
//       }
//     }

//     // Fallback to Resend (only for verified emails in sandbox)
//     if (this.resend) {
//       console.log('🔄 Attempting Resend API (fallback - sandbox mode)...');
//       try {
//         const result = await Promise.race([
//           this.resend.emails.send({
//             from: 'QCM Password Reset <onboarding@resend.dev>',
//             to: email,
//             subject: 'QCM - Password Reset Request',
//             html: this.getPasswordResetEmailHTML(resetUrl)
//           }),
//           new Promise((_, reject) => 
//             setTimeout(() => reject(new Error('Resend timeout')), 15000)
//           )
//         ]);
        
//         if (result.error) {
//           console.error('❌ Resend API error:', result.error);
//           throw new Error(result.error.message);
//         }
        
//         console.log('✅ Resend email sent successfully:', result);
//         return { success: true, message: 'Password reset email sent successfully via Resend' };
//       } catch (error) {
//         console.error('❌ Resend failed:', error.message);
//       }
//     }

//     // If both fail, throw error
//     console.error('❌ All email methods failed');
//     throw new Error('Unable to send password reset email. Please try again later or contact support.');
//   }

//   getPasswordResetEmailHTML(resetUrl) {
//     return `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <meta charset="utf-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>QCM Password Reset</title>
//         <style>
//           body { 
//             font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
//             line-height: 1.6; 
//             color: #333; 
//             margin: 0; 
//             padding: 0; 
//             background-color: #f4f4f4;
//           }
//           .container { 
//             max-width: 600px; 
//             margin: 20px auto; 
//             background-color: white;
//             border-radius: 10px;
//             overflow: hidden;
//             box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//           }
//           .header { 
//             background: linear-gradient(135deg, #14213D 0%, #1d2d50 100%);
//             color: white; 
//             padding: 30px 20px; 
//             text-align: center; 
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 28px;
//             font-weight: 600;
//           }
//           .content { 
//             padding: 30px 20px; 
//             background-color: #ffffff; 
//           }
//           .button { 
//             display: inline-block; 
//             padding: 15px 30px; 
//             background: linear-gradient(135deg, #14213D 0%, #1d2d50 100%);
//             color: white !important; 
//             text-decoration: none; 
//             border-radius: 8px; 
//             margin: 25px 0; 
//             font-weight: 600;
//             font-size: 16px;
//             transition: transform 0.2s;
//           }
//           .button:hover {
//             transform: translateY(-2px);
//           }
//           .footer { 
//             padding: 20px; 
//             text-align: center; 
//             font-size: 12px; 
//             color: #666; 
//             background-color: #f8f9fa;
//           }
//           .warning { 
//             background-color: #fff3cd; 
//             border-left: 4px solid #ffc107;
//             padding: 15px; 
//             border-radius: 5px; 
//             margin: 20px 0; 
//           }
//           .url-box {
//             word-break: break-all; 
//             background-color: #f8f9fa; 
//             padding: 15px; 
//             border-radius: 5px;
//             border: 1px solid #dee2e6;
//             font-family: monospace;
//             font-size: 14px;
//           }
//           .logo {
//             font-size: 24px;
//             font-weight: bold;
//             margin-bottom: 10px;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <div class="logo">🎯 QCM</div>
//             <h1>Password Reset Request</h1>
//           </div>
//           <div class="content">
//             <h2 style="color: #14213D; margin-top: 0;">Reset Your Password</h2>
//             <p>Hello,</p>
//             <p>We received a request to reset your password for your QCM account. If you made this request, click the button below to reset your password:</p>
            
//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${resetUrl}" class="button">Reset My Password</a>
//             </div>
            
//             <div class="warning">
//               <strong>🔒 Security Notice:</strong>
//               <ul style="margin: 10px 0; padding-left: 20px;">
//                 <li>This link will expire in <strong>1 hour</strong> for security reasons</li>
//                 <li>If you didn't request this reset, please ignore this email</li>
//                 <li>Never share this link with anyone</li>
//                 <li>Make sure you're on the official QCM website when resetting</li>
//               </ul>
//             </div>
            
//             <p><strong>If the button doesn't work, copy and paste this link into your browser:</strong></p>
//             <div class="url-box">
//               ${resetUrl}
//             </div>
            
//             <p style="margin-top: 30px;">If you have any questions or didn't request this reset, please contact our support team immediately.</p>
            
//             <p style="margin-bottom: 0;">Best regards,<br><strong>The QCM Team</strong></p>
//           </div>
//           <div class="footer">
//             <p>This is an automated email. Please do not reply to this message.</p>
//             <p>&copy; ${new Date().getFullYear()} Quizzers Club MANIT. All rights reserved.</p>
//             <p>🌐 <a href="https://quizzersclubmanit.in" style="color: #14213D;">quizzersclubmanit.in</a></p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;
//   }

//   async testEmailConfig() {
//     console.log('🧪 Testing email configuration...');
    
//     const results = {
//       gmail: null,
//       resend: null
//     };

//     // Test Gmail
//     if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
//       try {
//         await Promise.race([
//           this.transporter.verify(),
//           new Promise((_, reject) => 
//             setTimeout(() => reject(new Error('Connection timeout')), 5000)
//           )
//         ]);
//         results.gmail = { success: true, message: 'Gmail SMTP is working' };
//       } catch (error) {
//         results.gmail = { success: false, error: error.message };
//       }
//     } else {
//       results.gmail = { success: false, message: 'Gmail credentials not configured' };
//     }

//     // Test Resend
//     if (this.resend) {
//       results.resend = { success: true, message: 'Resend API key is configured (sandbox mode)' };
//     } else {
//       results.resend = { success: false, message: 'Resend API key not configured' };
//     }

//     const hasWorkingProvider = results.gmail?.success || results.resend?.success;
    
//     return {
//       success: hasWorkingProvider,
//       message: hasWorkingProvider ? 'At least one email provider is working' : 'No working email providers found',
//       details: results,
//       recommendation: results.gmail?.success ? 
//         'Gmail is working - can send to any email address' : 
//         'Only Resend available - limited to verified emails in sandbox mode'
//     };
//   }
// }

// const emailService = new EmailService();
// export default emailService;

import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

class EmailService {
  constructor() {
    // Only Gmail - multiple configurations to bypass hosting restrictions
    this.transporters = [];

    // Configuration 1: Direct Gmail SMTP
    if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
      this.transporters.push({
        name: 'Gmail Direct',
        transporter: nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          },
          tls: { rejectUnauthorized: false },
          connectionTimeout: 60000,
          greetingTimeout: 30000,
          socketTimeout: 60000
        })
      });

      // Configuration 2: Gmail with different port
      this.transporters.push({
        name: 'Gmail Port 465',
        transporter: nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          },
          tls: { rejectUnauthorized: false }
        })
      });

      // Configuration 3: Gmail service shorthand
      this.transporters.push({
        name: 'Gmail Service',
        transporter: nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD
          },
          tls: { rejectUnauthorized: false }
        })
      });
    }

    console.log('🚀 Gmail-only email service initialized with', this.transporters.length, 'configurations');
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

    const mailOptions = {
      from: `"QCM Password Reset" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'QCM - Password Reset Request',
      html: this.getPasswordResetEmailHTML(resetUrl)
    };

    // Try each Gmail configuration until one works
    for (let i = 0; i < this.transporters.length; i++) {
      const { name, transporter } = this.transporters[i];
      
      console.log(`🔄 Attempting ${name}...`);
      
      try {
        // First verify the connection
        await transporter.verify();
        console.log(`✅ ${name} connection verified`);
        
        // Then send the email
        const result = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully via ${name}:`, result.messageId);
        
        return { 
          success: true, 
          message: `Password reset email sent successfully via ${name}`,
          messageId: result.messageId 
        };
      } catch (error) {
        console.error(`❌ ${name} failed:`, error.message);
        
        // If this is the last transporter and it failed, throw error
        if (i === this.transporters.length - 1) {
          throw new Error(`All Gmail configurations failed. Last error: ${error.message}`);
        }
        
        // Otherwise, continue to next configuration
        continue;
      }
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
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background-color: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #14213D 0%, #1d2d50 100%);
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content { 
            padding: 30px 20px; 
            background-color: #ffffff; 
          }
          .button { 
            display: inline-block; 
            padding: 15px 30px; 
            background: linear-gradient(135deg, #14213D 0%, #1d2d50 100%);
            color: white !important; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 25px 0; 
            font-weight: 600;
            font-size: 16px;
          }
          .footer { 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #666; 
            background-color: #f8f9fa;
          }
          .warning { 
            background-color: #fff3cd; 
            border-left: 4px solid #ffc107;
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .url-box {
            word-break: break-all; 
            background-color: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px;
            border: 1px solid #dee2e6;
            font-family: monospace;
            font-size: 14px;
          }
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

  async testEmailConfig() {
    console.log('🧪 Testing Gmail configurations...');
    
    const results = [];
    
    for (const { name, transporter } of this.transporters) {
      try {
        await transporter.verify();
        results.push({ name, success: true, message: 'Connection successful' });
      } catch (error) {
        results.push({ name, success: false, error: error.message });
      }
    }
    
    const workingConfigs = results.filter(r => r.success);
    
    return {
      success: workingConfigs.length > 0,
      message: workingConfigs.length > 0 ? 
        `${workingConfigs.length} Gmail configuration(s) working` : 
        'No Gmail configurations working',
      details: results
    };
  }
}

const emailService = new EmailService();
export default emailService;

