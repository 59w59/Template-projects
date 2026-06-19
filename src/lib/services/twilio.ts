import twilio from "twilio"
import { getSystemSettings } from "../settings/system-settings"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

export async function sendSMS(to: string, message: string): Promise<boolean> {
  const settings = await getSystemSettings()
  const activeSid = settings.twilioAccountSid || accountSid
  const activeAuthToken = settings.twilioAuthToken || authToken
  const activeFromNumber = settings.twilioFromNumber || fromNumber

  if (!activeSid || !activeAuthToken || !activeFromNumber) {
    return true
  }

  try {
    const client = twilio(activeSid, activeAuthToken)
    await client.messages.create({
      body: message,
      from: activeFromNumber,
      to: to,
    })
    return true
  } catch {
    return false
  }
}
