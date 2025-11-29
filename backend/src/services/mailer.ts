// mailer.ts
import nodemailer from "nodemailer";

interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

export async function createEmailTransporter() {
  const host = process.env.EMAIL_HOST || "smtp.yourdomain.com";
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    requireTLS: port === 587,     // FORCE TLS on 587
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    tls: { rejectUnauthorized: true },
  });
}

export async function sendEmail({ from, to, subject, html, attachments }: SendEmailOptions) {
  try {
    const transporter = await createEmailTransporter();
    await transporter.sendMail({
      from: from ||`${process.env.APP_NAme} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Failed to send email:", err);
  }
}
