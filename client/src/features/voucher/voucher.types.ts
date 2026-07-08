export type VoucherDiscountType = 'percent' | 'fixed'

export type Voucher = {
  _id: string
  code: string
  name: string
  description?: string
  discountType: VoucherDiscountType
  discountValue: number
  maxDiscountAmount?: number
  minOrderAmount?: number
  usageLimit?: number
  usedCount?: number
  startDate: string
  endDate: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export type VoucherPayload = Omit<Voucher, '_id' | 'createdAt' | 'updatedAt' | 'usedCount'> & {
  description?: string
  maxDiscountAmount?: number
  minOrderAmount?: number
  usageLimit?: number
}

export type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}
