import type { Dayjs } from "dayjs"
export type UserRole = 'admin' | 'staff' | 'customer'

export type AuthUser = {
  _id: string
  fullName: string
  email: string
  phone?: string
  dateOfBirth?: Dayjs | string
  address?: string
  role: UserRole
  avatar?: string
  password?: string;
}

export type LoginPayload = {
  email: string
  password: string
}

export type RegisterPayload = LoginPayload & {
  fullName: string
  phone: string
  dateOfBirth?: string
  address?: string
}

export type AuthResponse = {
  success?: boolean
  message?: string
  token?: string
  user: AuthUser
}
export type ChangePassword = {
  currentPassword: string
  newPassword: string,
  confirmPassword: string
}