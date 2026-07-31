export type InventoryItem = {
  _id: string;
  name: string;
  unit: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity?: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateInventoryPayload = {
  name: string;
  unit: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type UpdateInventoryPayload = Partial<CreateInventoryPayload>;

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};
