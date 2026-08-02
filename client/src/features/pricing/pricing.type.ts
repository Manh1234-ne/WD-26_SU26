export interface PricingRule {
    _id: string;
    name: string;
    ruleType: "peak_hour" | "weekend" | "holiday";
    surchargePercentage: number;
    startTime?: string;
    endTime?: string;
    date?: string;
    endDate?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreatePricingRulePayload {
    name: string;
    ruleType: "peak_hour" | "weekend" | "holiday";
    surchargePercentage: number;
    startTime?: string;
    endTime?: string;
    date?: string;
    endDate?: string;
    isActive?: boolean;
}

export interface UpdatePricingRulePayload extends Partial<CreatePricingRulePayload> {}
