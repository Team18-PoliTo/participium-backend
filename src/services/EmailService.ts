import { Resend } from "resend";
import disposableDomains from "disposable-email-domains";

class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn(
        "RESEND_API_KEY not found in environment variables. Email sending will be disabled."
      );
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || "participium@merguven.me";
  }

  /**
   * Send verification code email to a new user
   */
  async sendVerificationEmail(
    to: string,
    verificationCode: string,
    firstName: string
  ): Promise<void> {
    try {
      const html = this.getVerificationEmailTemplate(
        verificationCode,
        firstName
      );

      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject: "Verify Your Participium Account",
        html,
      });

      console.log(`Verification email sent to ${to}`);
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw new Error("Failed to send verification email");
    }
  }

  /**
   * Generate HTML template for verification email
   */
  private getVerificationEmailTemplate(
    code: string,
    firstName: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Account</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 18px;
      color: #333333;
      margin-bottom: 20px;
    }
    .message {
      font-size: 16px;
      color: #666666;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .code-container {
      background-color: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .code-label {
      font-size: 14px;
      color: #666666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    .expiry {
      font-size: 14px;
      color: #999999;
      margin-top: 15px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #999999;
      border-top: 1px solid #e9ecef;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏛️ Participium</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hello ${this.escapeHtml(firstName)},</p>
      
      <p class="message">
        Thank you for registering with Participium! To complete your registration 
        and start using the system, please verify your email address using the 
        code below:
      </p>
      
      <div class="code-container">
        <div class="code-label">Your Verification Code</div>
        <div class="code">${code}</div>
        <div class="expiry">⏱️ This code expires in 30 minutes</div>
      </div>
      
      <p class="message">
        Enter this code in the application to activate your account and start 
        reporting issues in your community.
      </p>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong> If you didn't create an account with 
        Participium, please ignore this email. Your email address will not be used.
      </div>
    </div>
    
    <div class="footer">
      <p>
        This is an automated message from Participium.<br>
        Please do not reply to this email.
      </p>
      <p style="margin-top: 15px; font-size: 12px;">
        By using Participium, you agree to our 
        <a href="${process.env.FRONTEND_URL || "https://participium.example.com"}/terms" style="color: #667eea; text-decoration: none;">terms of service</a> 
        and 
        <a href="${process.env.FRONTEND_URL || "https://participium.example.com"}/privacy" style="color: #667eea; text-decoration: none;">privacy policy</a>.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Generate a 6-digit verification code
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get expiration time for verification code (30 minutes from now)
   */
  getVerificationCodeExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 30);
    return expiry;
  }

  /**
   * Validate email address for quality and security
   */
  validateEmailQuality(email: string): {
    valid: boolean;
    error?: string;
  } {
    const normalizedEmail = email.trim().toLowerCase();
    const domain = normalizedEmail.split("@")[1];

    if (!domain) {
      return { valid: false, error: "Invalid email format" };
    }

    // Check for disposable/temporary email services
    if (disposableDomains.includes(domain)) {
      return {
        valid: false,
        error:
          "Temporary email addresses are not allowed. Please use a permanent email address.",
      };
    }

    // Check for role-based emails (optional warning, not blocking)
    const rolePatterns =
      /^(admin|info|support|noreply|no-reply|webmaster|postmaster)@/i;
    if (rolePatterns.test(normalizedEmail)) {
      console.warn(
        `Role-based email detected: ${normalizedEmail}. Consider reviewing.`
      );
      // Not blocking for now, but you could return {valid: false} here
    }

    return { valid: true };
  }
}

export default EmailService;
