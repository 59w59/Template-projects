export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

export function sanitizeMongoKeys(data: any): any {
  if (data === null || data === undefined) return data

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMongoKeys(item))
  }

  if (typeof data === "object") {
    const cleaned: Record<string, any> = {}
    for (const key of Object.keys(data)) {
      if (key.startsWith("$")) {
        continue
      }
      cleaned[key] = sanitizeMongoKeys(data[key])
    }
    return cleaned
  }

  return data
}

export function sanitizePayload(data: any): any {
  if (data === null || data === undefined) return data

  if (typeof data === "string") {
    return escapeHTML(data.trim())
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item))
  }

  if (typeof data === "object") {
    const cleaned: Record<string, any> = {}
    for (const key of Object.keys(data)) {
      if (key.startsWith("$")) {
        continue
      }
      cleaned[key] = sanitizePayload(data[key])
    }
    return cleaned
  }

  return data
}
