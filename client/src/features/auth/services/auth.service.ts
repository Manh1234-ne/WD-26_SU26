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
  const response = await api.post<AuthResponse>('/auth/change_password', payload)
  return response.data
}
export async function googleSignIn(payload: any) {
  const response = await api.post<AuthResponse>('/auth/google_signIn', payload)
  return response.data
}

export async function logout() {
  await api.post('/auth/signOut')
}

export async function updateProfile(id: string, payload: any) {
  const response = await api.put<AuthResponse>(`/auth/update-profile/${id}`, payload)
  return response.data
}

export async function getProfile(id: string) {
  const response = await api.get<AuthResponse>(`/auth/profile/${id}`);
  return response.data
}