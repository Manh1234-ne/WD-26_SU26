import { create } from 'zustand'
import type { AuthUser } from './auth.types'

const TOKEN_KEY = 'cinema_token'
const USER_KEY = 'cinema_user'

type AuthState = {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (token: string, user: AuthUser) => void
  clearAuth: () => void
}

function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

const storedToken = localStorage.getItem(TOKEN_KEY)
const storedUser = getStoredUser()

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser,
  isAuthenticated: Boolean(storedToken && storedUser),
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },
  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
