import { api } from "../../services/api";
import type { PricingRule, CreatePricingRulePayload, UpdatePricingRulePayload } from "./pricing.type";

export const getAllPricingRules = async (): Promise<PricingRule[]> => {
    const response = await api.get("/pricing-rules");
    return response.data.data;
};

export const getPricingRuleById = async (id: string): Promise<PricingRule> => {
    const response = await api.get(`/pricing-rules/${id}`);
    return response.data.data;
};

export const createPricingRule = async (payload: CreatePricingRulePayload): Promise<PricingRule> => {
    const response = await api.post("/pricing-rules", payload);
    return response.data.data;
};

export const updatePricingRule = async (id: string, payload: UpdatePricingRulePayload): Promise<PricingRule> => {
    const response = await api.put(`/pricing-rules/${id}`, payload);
    return response.data.data;
};

export const deletePricingRule = async (id: string): Promise<void> => {
    await api.delete(`/pricing-rules/${id}`);
};
