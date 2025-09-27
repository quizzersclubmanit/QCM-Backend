
// import nodemailer from 'nodemailer';
// import jwt from 'jsonwebtoken';

// class EmailService {
//   constructor() {
//     // Only Gmail - multiple configurations to bypass hosting restrictions
//     this.transporters = [];

//     // Configuration 1: Direct Gmail SMTP
//     if (process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD) {
//       this.transporters.push({
//         name: 'Gmail Direct',
//         transporter: nodemailer.createTransport({
//           host: 'smtp.gmail.com',
//           port: 587,
//           secure: false,
//           auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_APP_PASSWORD
//           },
//           tls: { rejectUnauthorized: false },
//           connectionTimeout: 60000,
//           greetingTimeout: 30000,
//           socketTimeout: 60000
//         })
//       });

//       // Configuration 2: Gmail with different port
//       this.transporters.push({
//         name: 'Gmail Port 465',
//         transporter: nodemailer.createTransport({
//           host: 'smtp.gmail.com',
//           port: 465,
//           secure: true,
//           auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_APP_PASSWORD
//           },
//           tls: { rejectUnauthorized: false }
//         })
//       });

//       // Configuration 3: Gmail service shorthand
//       this.transporters.push({
//         name: 'Gmail Service',
//         transporter: nodemailer.createTransport({
//           service: 'gmail',
//           auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_APP_PASSWORD
//           },
//           tls: { rejectUnauthorized: false }
//         })
//       });
//     }

//     console.log('🚀 Gmail-only email service initialized with', this.transporters.length, 'configurations');
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

//     const mailOptions = {
//       from: `"QCM Password Reset" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: 'QCM - Password Reset Request',
//       html: this.getPasswordResetEmailHTML(resetUrl)
//     };

//     // Try each Gmail configuration until one works
//     for (let i = 0; i < this.transporters.length; i++) {
//       const { name, transporter } = this.transporters[i];
      
//       console.log(`🔄 Attempting ${name}...`);
      
//       try {
//         // First verify the connection
//         await transporter.verify();
//         console.log(`✅ ${name} connection verified`);
        
//         // Then send the email
//         const result = await transporter.sendMail(mailOptions);
//         console.log(`✅ Email sent successfully via ${name}:`, result.messageId);
        
//         return { 
//           success: true, 
//           message: `Password reset email sent successfully via ${name}`,
//           messageId: result.messageId 
//         };
//       } catch (error) {
//         console.error(`❌ ${name} failed:`, error.message);
        
//         // If this is the last transporter and it failed, throw error
//         if (i === this.transporters.length - 1) {
//           throw new Error(`All Gmail configurations failed. Last error: ${error.message}`);
//         }
        
//         // Otherwise, continue to next configuration
//         continue;
//       }
//     }
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
//         </style>
//       </head>
//       <body>
//         <div class="container">
//           <div class="header">
//             <h1>🎯 QCM Password Reset</h1>
//           </div>
//           <div class="content">
//             <h2 style="color: #14213D; margin-top: 0;">Reset Your Password</h2>
//             <p>Hello,</p>
//             <p>We received a request to reset your password for your QCM account. Click the button below to reset your password:</p>
            
//             <div style="text-align: center; margin: 30px 0;">
//               <a href="${resetUrl}" class="button">Reset My Password</a>
//             </div>
            
//             <div class="warning">
//               <strong>🔒 Security Notice:</strong>
//               <ul style="margin: 10px 0; padding-left: 20px;">
//                 <li>This link will expire in <strong>1 hour</strong></li>
//                 <li>If you didn't request this reset, please ignore this email</li>
//                 <li>Never share this link with anyone</li>
//               </ul>
//             </div>
            
//             <p><strong>If the button doesn't work, copy this link:</strong></p>
//             <div class="url-box">${resetUrl}</div>
            
//             <p style="margin-top: 30px;">Best regards,<br><strong>The QCM Team</strong></p>
//           </div>
//           <div class="footer">
//             <p>This is an automated email. Please do not reply.</p>
//             <p>&copy; ${new Date().getFullYear()} Quizzers Club MANIT. All rights reserved.</p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `;
//   }

//   async testEmailConfig() {
//     console.log('🧪 Testing Gmail configurations...');
    
//     const results = [];
    
//     for (const { name, transporter } of this.transporters) {
//       try {
//         await transporter.verify();
//         results.push({ name, success: true, message: 'Connection successful' });
//       } catch (error) {
//         results.push({ name, success: false, error: error.message });
//       }
//     }
    
//     const workingConfigs = results.filter(r => r.success);
    
//     return {
//       success: workingConfigs.length > 0,
//       message: workingConfigs.length > 0 ? 
//         `${workingConfigs.length} Gmail configuration(s) working` : 
//         'No Gmail configurations working',
//       details: results
//     };
//   }
// }




import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';

class EmailService {
  constructor() {
    // Initialize SendGrid (works on all hosting providers)
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('✅ SendGrid initialized successfully');
    } else {
      console.log('❌ SendGrid API key not found');
    }

    console.log('🚀 SendGrid email service initialized');
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


// const emailService = new EmailService();
// export default emailService;

