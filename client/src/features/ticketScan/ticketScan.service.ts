import { api } from "../../services/api";
import type { VerifyTicketResponse } from "./ticketScan.type";

export const verifyTicketApi = async (qrData: string): Promise<VerifyTicketResponse> => {
  const response = await api.post<VerifyTicketResponse>("/tickets/verify", { qrData });
  return response.data;
};