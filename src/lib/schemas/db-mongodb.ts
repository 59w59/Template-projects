import { ObjectId } from "mongodb"

export interface UserDocument {
  _id?: ObjectId
  id: string
  email: string
  passwordHash: string
  role: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  twoFactorCode?: string
  twoFactorExpiresAt?: Date
  resetTokenHash?: string
  resetTokenExpiresAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface SessionDocument {
  _id?: ObjectId
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  ipAddress: string
  userAgent: string
  isValid: boolean
  createdAt: Date
}

export interface AuditLogDocument {
  _id?: ObjectId
  id: string
  userId: string | null
  action: string
  status: string
  ipAddress: string
  userAgent: string
  details?: string
  createdAt: Date
}

export interface OrganizationDocument {
  _id?: ObjectId
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationMemberDocument {
  _id?: ObjectId
  id: string
  organizationId: string
  userId: string
  role: string
  createdAt: Date
}

export interface OrganizationInvitationDocument {
  _id?: ObjectId
  id: string
  organizationId: string
  email: string
  role: string
  token: string
  expiresAt: Date
  createdAt: Date
}

export interface SubscriptionDocument {
  _id?: ObjectId
  id: string
  userId: string
  organizationId?: string | null
  gateway: string
  gatewayCustomerId?: string
  gatewaySubscriptionId?: string
  status: string
  planId: string
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface StoredFileDocument {
  _id?: ObjectId
  id: string
  userId: string
  organizationId?: string | null
  fileName: string
  fileKey: string
  fileSize: number
  mimeType: string
  storageProvider: string
  createdAt: Date
}

export interface NotificationDocument {
  _id?: ObjectId
  id: string
  userId: string
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: Date
}
