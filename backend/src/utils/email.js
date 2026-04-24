const nodemailer = require("nodemailer");

let cachedTransporter = null;

const smtpConfig = () => ({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
});

exports.isSmtpConfigured = () => {
  const { host, user, pass } = smtpConfig();
  return Boolean(host && user && pass);
};

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const { host, port, user, pass } = smtpConfig();

  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.");
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  return cachedTransporter;
};

exports.sendOtpEmail = async ({ toEmail, name, otp }) => {
  const transporter = getTransporter();

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Renzi OTP Verification",
    text: `Hi ${name || "there"}, your Renzi verification code is ${otp}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 8px;">Verify your Renzi account</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your one-time verification code is:</p>
        <p style="font-size: 30px; font-weight: 700; letter-spacing: 3px; margin: 12px 0;">${otp}</p>
        <p>This code expires in 10 minutes.</p>
        <p style="font-size: 12px; color: #6b7280;">If you did not request this, you can ignore this email.</p>
      </div>
    `
  });

  return { sent: true };
};
