import { api } from '../../services/api';
import type { ApiResponse, Combo, ComboPayload, InventoryItem } from './combo.types';

export async function getAllCombos(adminMode = false) {
  const url = adminMode ? '/combos?admin=true' : '/combos';
  const res = await api.get<ApiResponse<Combo[]>>(url);
  return res.data.data;
}

export async function getComboById(id: string) {
  const res = await api.get<ApiResponse<Combo>>(`/combos/${id}`);
  return res.data.data;
}

export async function createCombo(payload: ComboPayload) {
  const res = await api.post<ApiResponse<Combo>>('/combos', payload);
  return res.data.data;
}

export async function updateCombo(id: string, payload: Partial<ComboPayload>) {
  const res = await api.put<ApiResponse<Combo>>(`/combos/${id}`, payload);
  return res.data.data;
}

export async function deleteCombo(id: string) {
  const res = await api.delete<ApiResponse<Combo>>(`/combos/${id}`);
  return res.data.data;
}

export async function getAllInventoryItems() {
  const res = await api.get<ApiResponse<InventoryItem[]>>('/inventory?admin=true');
  return res.data.data;
}
