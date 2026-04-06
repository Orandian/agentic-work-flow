'use client'

import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import type {
  RegisterPayload,
  LoginPayload,
  VerifyOtpPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  ApiResponse,
  AuthResponse,
} from '@/types/auth'

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await axios.post<ApiResponse<null>>(
        '/api/auth/register',
        payload
      )
      return data
    },
  })
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (payload: VerifyOtpPayload) => {
      const { data } = await axios.post<ApiResponse<null>>(
        '/api/auth/verify-otp',
        payload
      )
      return data
    },
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await axios.post<ApiResponse<AuthResponse>>(
        '/api/auth/login',
        payload
      )
      return data
    },
    onSuccess: (data) => {
      if (data.data?.token) {
        localStorage.setItem('ac_token', data.data.token)
      }
    },
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      const { data } = await axios.post<ApiResponse<null>>(
        '/api/auth/forgot-password',
        payload
      )
      return data
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      const { data } = await axios.post<ApiResponse<null>>(
        '/api/auth/reset-password',
        payload
      )
      return data
    },
  })
}
