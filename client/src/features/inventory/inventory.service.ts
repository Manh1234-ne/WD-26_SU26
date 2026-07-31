import { api } from '../../services/api';
import type { ApiResponse, CreateInventoryPayload, InventoryItem, UpdateInventoryPayload } from './inventory.types';

export async function getAllInventory(adminMode = true) {
  const url = adminMode ? '/inventory?admin=true' : '/inventory';
  const res = await api.get<ApiResponse<InventoryItem[]>>(url);
  return res.data.data;
}

export async function getInventoryById(id: string) {
  const res = await api.get<ApiResponse<InventoryItem>>(`/inventory/${id}`);
  return res.data.data;
}

export async function createInventory(payload: CreateInventoryPayload) {
  const res = await api.post<ApiResponse<InventoryItem>>('/inventory', payload);
  return res.data.data;
}

export async function updateInventory(id: string, payload: UpdateInventoryPayload) {
  const res = await api.put<ApiResponse<InventoryItem>>(`/inventory/${id}`, payload);
  return res.data.data;
}

export async function restockInventory(id: string, quantity: number) {
  const res = await api.patch<ApiResponse<InventoryItem>>(`/inventory/${id}/restock`, { quantity });
  return res.data.data;
}

export async function deleteInventory(id: string) {
  const res = await api.delete<ApiResponse<InventoryItem>>(`/inventory/${id}`);
  return res.data.data;
}

export async function getLowStockInventory() {
  const res = await api.get<ApiResponse<InventoryItem[]>>('/inventory/low-stock');
  return res.data.data;
}
