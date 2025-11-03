import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GMAIL_CLIENT_ID!,
  process.env.GMAIL_CLIENT_SECRET!,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN!,
});

async function createTransporter() {
  const accessTokenResponse = await oauth2Client.getAccessToken();
  const accessToken = accessTokenResponse?.token;

  if (!accessToken) throw new Error('Failed to retrieve access token');

  // Explicitly type as SMTPTransport.Options
  const smtpOptions: SMTPTransport.Options = {
    host: 'gmail',
    //port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER!,
      clientId: process.env.GMAIL_CLIENT_ID!,
      clientSecret: process.env.GMAIL_CLIENT_SECRET!,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      accessToken,
    },
  };

  return nodemailer.createTransport(smtpOptions);
}

export async function sendInvoiceEmail(to: string, subject: string, html: string) {
  try {
    const transporter = await createTransporter();
    await transporter.sendMail({
      from: `Your Company <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Invoice email sent to ${to}`);
  } catch (error) {
    console.error('❌ Failed to send invoice email:', error);
  }
}
