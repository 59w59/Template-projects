import SMTPTransport from "nodemailer/lib/smtp-transport"

declare module "nodemailer" {
  interface SendMailOptions {
    template?: string
    context?: Record<string, any>
  }
}
export type MailConfig = SMTPTransport.Options
