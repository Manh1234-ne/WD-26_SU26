import { api } from '../../services/api'
import type { ApiResponse, Voucher, VoucherPayload } from './voucher.types'

export async function getVouchers() {
  const response = await api.get<ApiResponse<Voucher[]>>('/vouchers')
  return response.data.data
}

export async function getVoucherById(id: string) {
  const response = await api.get<ApiResponse<Voucher>>(`/vouchers/${id}`)
  return response.data.data
}

export async function createVoucher(payload: VoucherPayload) {
  const response = await api.post<ApiResponse<Voucher>>('/vouchers', payload)
  return response.data.data
}

export async function updateVoucher(id: string, payload: VoucherPayload) {
  const response = await api.put<ApiResponse<Voucher>>(`/vouchers/${id}`, payload)
  return response.data.data
}

export async function deleteVoucher(id: string) {
  await api.delete(`/vouchers/${id}`)
}
