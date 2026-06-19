import twilio from "twilio"

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null

export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!twilioClient || !fromNumber) {
    return true
  }
  try {
    await twilioClient.messages.create({
      body: message,
      from: fromNumber,
      to: to,
    })
    return true
  } catch {
    return false
  }
}
