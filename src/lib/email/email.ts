import nodemailer from "nodemailer"
import { logger } from "../logger/logger"
import { emailPresets } from "./presets"
import { MailConfig } from "@/types/nodemailer"

const emailService = process.env.EMAIL_SERVICE || "smtp"
const emailUser = process.env.EMAIL_USER
const emailPass = process.env.EMAIL_PASS
const emailApiKey = process.env.EMAIL_API_KEY
const fromEmail = process.env.EMAIL_FROM || "no-reply@template.com"

function getMailConfig(): MailConfig | null {
  if (emailService === "hostinger" && emailUser && emailPass) {
    return emailPresets.hostinger({ user: emailUser, pass: emailPass })
  }
  if (emailService === "resend" && emailApiKey) {
    return emailPresets.resend({ apiKey: emailApiKey })
  }
  if (emailService === "sendgrid" && emailApiKey) {
    return emailPresets.sendgrid({ apiKey: emailApiKey })
  }
  if (emailUser && emailPass) {
    return {
      host: process.env.EMAIL_HOST || "localhost",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    }
  }
  return null
}

const config = getMailConfig()
const transporter = config ? nodemailer.createTransport(config) : null

export async function sendMail(options: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!transporter) {
    logger.info(`[Email Console Fallback] Email would be sent to: ${options.to}`)
    logger.info(`Subject: ${options.subject}`)
    logger.info(`HTML Content:\n${options.html}`)
    return true
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    logger.info(`Email sent successfully to ${options.to}`)
    return true
  } catch (err: any) {
    logger.error(`Failed to send email to ${options.to}:`, err)
    return false
  }
}

export async function sendWelcomeEmail(to: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a;">Bem-vindo ao Boilerplate Template!</h2>
      <p style="color: #475569; line-height: 1.6;">Obrigado por se cadastrar na nossa plataforma. Seu projeto já está com todas as conexões prontas e segurança ativada.</p>
      <div style="margin: 24px 0;">
        <a href="https://localhost:3000/dashboard" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Acessar Dashboard</a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Se você não solicitou este cadastro, por favor ignore este e-mail.</p>
    </div>
  `
  return sendMail({ to, subject: "Bem-vindo ao Boilerplate Template!", html })
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a;">Recuperação de Senha</h2>
      <p style="color: #475569; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha:</p>
      <div style="margin: 24px 0;">
        <a href="${resetLink}" style="background-color: #ef4444; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Redefinir Senha</a>
      </div>
      <p style="color: #64748b; font-size: 14px;">Este link expira em 1 hora.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">Se você não solicitou a redefinição de senha, nenhuma ação é necessária.</p>
    </div>
  `
  return sendMail({ to, subject: "Recuperação de Senha", html })
}
