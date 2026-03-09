import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

export function getMailTransporter() {
  if (transporter) return transporter;

  const config = useRuntimeConfig();

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_APP_PASSWORD,
    },
  });

  return transporter;
}
