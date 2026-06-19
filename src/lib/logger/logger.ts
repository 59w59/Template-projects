type LogLevel = "debug" | "info" | "warn" | "error"

interface LogPayload {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: {
    message: string
    stack?: string
  }
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production"

  private formatMessage(payload: LogPayload): string {
    if (this.isProduction) {
      return JSON.stringify(payload)
    }
    const colors = {
      debug: "\x1b[36m",
      info: "\x1b[32m",
      warn: "\x1b[33m",
      error: "\x1b[31m",
      reset: "\x1b[0m",
    }
    const color = colors[payload.level] || colors.reset
    const ctxString = payload.context ? ` | Context: ${JSON.stringify(payload.context)}` : ""
    const errString = payload.error ? ` | Error: ${payload.error.message}${payload.error.stack ? `\n${payload.error.stack}` : ""}` : ""
    return `[${payload.timestamp}] ${color}${payload.level.toUpperCase()}${colors.reset}: ${payload.message}${ctxString}${errString}`
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }
    if (context) {
      payload.context = context
    }
    if (error) {
      payload.error = {
        message: error.message,
        stack: error.stack,
      }
    }
    const formatted = this.formatMessage(payload)
    if (level === "error") {
      console.error(formatted)
    } else if (level === "warn") {
      console.warn(formatted)
    } else {
      console.log(formatted)
    }
  }

  public debug(message: string, context?: Record<string, any>) {
    if (!this.isProduction || process.env.LOG_LEVEL === "debug") {
      this.log("debug", message, context)
    }
  }

  public info(message: string, context?: Record<string, any>) {
    this.log("info", message, context)
  }

  public warn(message: string, context?: Record<string, any>, error?: Error) {
    this.log("warn", message, context, error)
  }

  public error(message: string, error?: Error, context?: Record<string, any>) {
    this.log("error", message, context, error)
  }
}

export const logger = new Logger()
export type { LogLevel, LogPayload }
