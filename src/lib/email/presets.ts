import { MailConfig } from "@/types/nodemailer"

export const emailPresets: Record<string, (options: any) => MailConfig> = {
  hostinger: (options) => ({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: {
      user: options.user,
      pass: options.pass,
    },
  }),
  resend: (options) => ({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: {
      user: "resend",
      pass: options.apiKey,
    },
  }),
  sendgrid: (options) => ({
    host: "smtp.sendgrid.net",
    port: 587,
    secure: false,
    auth: {
      user: "apikey",
      pass: options.apiKey,
    },
  }),
  mailgun: (options) => ({
    host: options.eu ? "smtp.eu.mailgun.org" : "smtp.mailgun.org",
    port: 587,
    secure: false,
    auth: {
      user: options.user,
      pass: options.pass,
    },
  }),
}
