export type InventoryItem = {
  _id: string;
  name: string;
  unit: string;
  stockQuantity?: number;
  isActive?: boolean;
};

export type ComboIngredient = {
  _id?: string;
  inventoryItem: InventoryItem | string;
  quantity: number;
};

export type Combo = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  isActive: boolean;
  ingredients: ComboIngredient[];
  createdAt: string;
  updatedAt: string;
};

export type ComboPayload = {
  name: string;
  description?: string;
  image?: string;
  price: number;
  isActive: boolean;
  ingredients: { inventoryItem: string; quantity: number }[];
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};
