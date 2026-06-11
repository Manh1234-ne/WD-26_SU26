import { api } from '../../../services/api'
import type { AuthResponse, LoginPayload, RegisterPayload } from '../auth.types'

export async function login(payload: LoginPayload) {
  const response = await api.post<AuthResponse>('/auth/signIn', payload)
  return response.data
}

export async function register(payload: RegisterPayload) {
  const response = await api.post<AuthResponse>('/auth/signUp', payload)
  return response.data
}

export async function logout() {
  await api.post('/auth/signOut')
}
