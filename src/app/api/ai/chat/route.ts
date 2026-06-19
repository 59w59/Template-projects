import { defineHandler, HttpError } from "@/lib/api/api-handler"
import { executeCopilotChat } from "@/lib/ai/copilot"
import { z } from "zod"

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(
    z.object({
      role: z.enum(["user", "model", "system"]),
      content: z.string()
    })
  ).default([])
})

export const POST = defineHandler(
  { schema: chatSchema, requireAuth: true },
  async ({ body, user }) => {
    if (user.role !== "admin") {
      throw new HttpError(403, "Acesso negado")
    }

    try {
      const responseText = await executeCopilotChat(body.message, body.history)
      return { response: responseText }
    } catch (err: any) {
      throw new HttpError(500, err.message)
    }
  }
)
