import { api } from '../../../services/api'
import type { AuthResponse, ChangePassword, LoginPayload, RegisterPayload } from '../auth.types'

export async function login(payload: LoginPayload) {
  const response = await api.post<AuthResponse>('/auth/signIn', payload)
  return response.data
}

export async function register(payload: RegisterPayload) {
  const response = await api.post<AuthResponse>('/auth/signUp', payload)
  return response.data
}

export async function changePassword(payload: ChangePassword) {
  const response = await api.post<AuthResponse>('/auth/change-password', payload)
  return response.data
}
export async function googleSignIn(payload: any) {
  const response = await api.post<AuthResponse>('/auth/google_signIn', payload)
  return response.data
}

export async function logout() {
  await api.post('/auth/signOut')
}
