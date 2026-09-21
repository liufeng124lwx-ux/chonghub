export type AfterSaleType = 'subscription_lost' | 'delivery_issue' | 'other';
export type AfterSaleStatus = 'open' | 'reviewing' | 'resolved' | 'closed';

export interface AfterSaleView { id: string; orderNumber: string; type: AfterSaleType; description: string; status: AfterSaleStatus; version: number; createdAt: string; refundCents: number; }
