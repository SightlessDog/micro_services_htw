import nodemailer from "nodemailer";
import { logger } from "./logger";

const FROM_ADDRESS = process.env.SMTP_FROM || "CRATE <noreply@crate.local>";

function smtpPort(): number {
  const raw = process.env.SMTP_PORT;
  if (!raw) return 1025;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid SMTP_PORT: ${raw}`);
  }
  return parsed;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "maildev",
  port: smtpPort(),
  secure: process.env.SMTP_SECURE === "true",
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
});

export async function verifyMailer(): Promise<void> {
  await transporter.verify();
  logger.info("SMTP transporter verified", { host: process.env.SMTP_HOST || "maildev", port: smtpPort() });
}

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
  await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });
}
