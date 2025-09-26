// import nodemailer from 'nodemailer';
// import { Resend } from 'resend';
// import jwt from 'jsonwebtoken';

// class EmailService {
//   constructor() {
//     // Try Resend first (more reliable for Railway), fallback to nodemailer
//     this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    
//     // Configure nodemailer with custom SMTP settings
//     this.transporter = nodemailer.createTransport({
//       host: process.env.SMTP_HOST || 'smtp.gmail.com',
//       port: parseInt(process.env.SMTP_PORT) || 587,
//       secure: false,
//       auth: {
//         user: process.env.SMTP_USER || process.env.EMAIL_USER,
//         pass: process.env.SMTP_PASS || process.env.EMAIL_APP_PASSWORD
//       },
//       tls: {
//         rejectUnauthorized: false
//       },
//       connectionTimeout: 60000,
//       greetingTimeout: 30000,
//       socketTimeout: 60000
//     });
//   }

//   // Generate secure password reset token
//   generateResetToken(userId, email) {
//     const payload = {
//       userId,
//       email,
//       type: 'password_reset',
//       timestamp: Date.now()
//     };
    
//     // Token expires in 1 hour
//     return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
//   }

//   // Verify password reset token
//   verifyResetToken(token) {
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
//       // Additional security: check if token is for password reset
//       if (decoded.type !== 'password_reset') {
//         throw new Error('Invalid token type');
//       }
      
//       return decoded;
//     } catch (error) {
//       throw new Error('Invalid or expired token');
//     }
//   }

//   // Send password reset email
//   async sendPasswordResetEmail(email, resetToken) {
//     console.log('Sending password reset email to:', email);
//     console.log('Email service config check:', {
//       RESEND_API_KEY: process.env.RESEND_API_KEY ? 'Set' : 'Not set',
//       SMTP_HOST: process.env.SMTP_HOST || 'Not set',
//       SMTP_PORT: process.env.SMTP_PORT || 'Not set',
//       SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not set',
//       SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not set',
//       EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
//       EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD ? 'Set (length: ' + (process.env.EMAIL_APP_PASSWORD?.length || 0) + ')' : 'Not set',
//       FRONTEND_URL: process.env.FRONTEND_URL || 'Not set'
//     });

//     const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password-page?token=${resetToken}`;
//     console.log('Reset URL generated:', resetUrl);

//     // Try Resend first (more reliable for Railway)
//     if (this.resend) {
//       console.log('Using Resend API for email sending');
//       try {
//         const result = await this.resend.emails.send({
//           from: 'QCM <noreply@quizzersclubmanit.in>',
//           to: email,
//           subject: 'QCM - Password Reset Request',
//           html: this.getPasswordResetEmailHTML(resetUrl)
//         });
//         console.log('Resend email sent successfully:', result);
//         return { success: true, message: 'Password reset email sent successfully via Resend' };
//       } catch (error) {
//         console.error('Resend email error:', error);
//         console.log('Falling back to nodemailer...');
//       }
//     }

//     // Fallback to nodemailer
//     console.log('Using nodemailer for email sending');
    
//     const mailOptions = {
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: 'QCM - Password Reset Request',
//       html: this.getPasswordResetEmailHTML(resetUrl)
//     };

//     try {
//       console.log('Attempting to send email with options:', {
//         from: mailOptions.from,
//         to: mailOptions.to,
//         subject: mailOptions.subject
//       });
      
//       const result = await this.transporter.sendMail(mailOptions);
//       console.log('Email sent successfully:', result);
//       return { success: true, message: 'Password reset email sent successfully' };
//     } catch (error) {
//       console.error('Email sending error details:', {
//         message: error.message,
//         code: error.code,
//         command: error.command,
//         response: error.response,
//         responseCode: error.responseCode
//       });
//       throw new Error(`Failed to send password reset email: ${error.message}`);
//     }
//   }

//   // Generate HTML for password reset email
//   getPasswordResetEmailHTML(resetUrl) {
//     return `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <style>
//           body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//           .header { background-color: #14213D; color: white; padding: 20px; text-align: center; }
//           .content { padding: 20px; background-color: #f9f9f9; }
//           .button { 
//             display: inline-block; 
//             padding: 12px 24px; 
//             background-color: #14213D; 
//             color: white; 
//             text-decoration: none; 
//             border-radius: 5px; 
//             margin: 20px 0; 
//           }
//           .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
//           .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>QCM Password Reset</h1>
//           </div>
//           <div class="content">
//             <h2>Reset Your Password</h2>
//             <p>Hello,</p>
//             <p>We received a request to reset your password for your QCM account. If you made this request, click the button below to reset your password:</p>
            
//             <div style="text-align: center;">
//               <a href="${resetUrl}" class="button">Reset Password</a>
//             </div>
            
//             <div class="warning">
//               <strong>Security Notice:</strong>
//               <ul>
//                 <li>This link will expire in 1 hour for security reasons</li>
//                 <li>If you didn't request this reset, please ignore this email</li>
//                 <li>Never share this link with anyone</li>
//               </ul>
//             </div>
            
//             <p>If the button doesn't work, copy and paste this link into your browser:</p>
//             <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
//               ${resetUrl}
//             </p>
            
//             <p>If you have any questions, please contact our support team.</p>
            
//             <p>Best regards,<br>The QCM Team</p>
//           </div>
//           <div class="footer">
//             <p>This is an automated email. Please do not reply to this message.</p>
//             <p>&copy; ${new Date().getFullYear()} QCM. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;
//   }

//   // Test email configuration
//   async testEmailConfig() {
//     try {
//       await this.transporter.verify();
//       return { success: true, message: 'Email configuration is valid' };
//     } catch (error) {
//       console.error('Email configuration error:', error);
//       return { success: false, message: 'Email configuration is invalid', error: error.message };
//     }
//   }
// }

// const emailService = new EmailService();
// export default emailService;

import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';

class EmailService {
  constructor() {
    // Try Resend first (more reliable for Railway), fallback to nodemailer
    this.resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    
    // Configure nodemailer with SHORTER timeouts and better error handling
    this.transporter = nodemailer.createTransporter({
      service: 'gmail', // Use service instead of host for better reliability
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_APP_PASSWORD
      },
      // REDUCED timeouts to fail fast instead of hanging
      connectionTimeout: 10000, // 10 seconds instead of 60
      greetingTimeout: 5000,     // 5 seconds instead of 30  
      socketTimeout: 10000,      // 10 seconds instead of 60
      // Additional Gmail-specific settings
      tls: {
        rejectUnauthorized: false
      },
      // Enable debug for troubleshooting
      debug: process.env.NODE_ENV !== 'production',
      logger: process.env.NODE_ENV !== 'production'
    });

    console.log('Email service initialized:', {
      resend: this.resend ? 'Available' : 'Not configured',
      gmail: (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) ? 'Configured' : 'Not configured',
      smtp: (process.env.SMTP_USER && process.env.SMTP_PASS) ? 'Configured' : 'Not configured'
    });
  }

  // Generate secure password reset token
  generateResetToken(userId, email) {
    const payload = {
      userId,
      email,
      type: 'password_reset',
      timestamp: Date.now()
    };
    
    // Token expires in 1 hour
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  }

  // Verify password reset token
  verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Additional security: check if token is for password reset
      if (decoded.type !== 'password_reset') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Send password reset email with FAST FAILOVER
  async sendPasswordResetEmail(email, resetToken) {
    console.log('Sending password reset email to:', email);
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password-page?token=${resetToken}`;
    console.log('Reset URL generated:', resetUrl);

    // Try Resend FIRST (most reliable for deployed apps)
    if (this.resend) {
      console.log('Attempting Resend API...');
      try {
        const result = await Promise.race([
          this.resend.emails.send({
            from: 'QCM <noreply@quizzersclubmanit.in>',
            to: email,
            subject: 'QCM - Password Reset Request',
            html: this.getPasswordResetEmailHTML(resetUrl)
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Resend timeout')), 15000)
          )
        ]);
        
        console.log('✅ Resend email sent successfully:', result);
        return { success: true, message: 'Password reset email sent successfully via Resend' };
      } catch (error) {
        console.error('❌ Resend failed:', error.message);
        // Continue to Gmail fallback
      }
    }

    // Fallback to Gmail with FAST timeout
    console.log('Attempting Gmail SMTP...');
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'QCM - Password Reset Request',
      html: this.getPasswordResetEmailHTML(resetUrl)
    };

    try {
      // Use Promise.race to implement our own timeout
      const result = await Promise.race([
        this.transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gmail SMTP timeout after 15 seconds')), 15000)
        )
      ]);
      
      console.log('✅ Gmail email sent successfully:', result.messageId);
      return { success: true, message: 'Password reset email sent successfully via Gmail' };
    } catch (error) {
      console.error('❌ Gmail SMTP failed:', error.message);
      
      // If it's a timeout, provide specific guidance
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        throw new Error('Email service timeout. This might be due to network restrictions. Please try again or contact support.');
      }
      
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  // Generate HTML for password reset email
  getPasswordResetEmailHTML(resetUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #14213D; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #14213D; 
            color: white; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>QCM Password Reset</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your QCM account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
              ${resetUrl}
            </p>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>The QCM Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} QCM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Test email configuration with FAST timeout
  async testEmailConfig() {
    try {
      // Quick test with 5 second timeout
      await Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 5000)
        )
      ]);
      return { success: true, message: 'Email configuration is valid' };
    } catch (error) {
      console.error('Email configuration error:', error);
      return { 
        success: false, 
        message: 'Email configuration is invalid', 
        error: error.message,
        suggestion: error.message.includes('timeout') ? 
          'Network timeout - try using Resend API instead of SMTP' : 
          'Check your email credentials'
      };
    }
  }
}

const emailService = new EmailService();
export default emailService;

