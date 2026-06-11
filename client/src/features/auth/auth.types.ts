export type UserRole = 'admin' | 'staff' | 'customer'

export type AuthUser = {
  _id: string
  fullName: string
  email: string
  phone?: string
  dateOfBirth?: string
  address?: string
  role: UserRole
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
  token: string
  user: AuthUser
}
