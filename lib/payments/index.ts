// 결제 스페이서 (10.5). 정식 런칭 때 구현한다.
// 결제 완료 시 해야 할 일은 하나: service role 로 grant_access(..., p_source => 'payment') 호출.

export type CheckoutInput = { userId: string; category: string; tier: "basic" | "standard" | "premium"; months: number };
export type CheckoutSession = { redirectUrl: string; orderId: string };
export type PaymentEvent = { orderId: string; status: "paid" | "cancelled" | "failed"; userId: string; category: string; tier: string; months: number };

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutSession>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent | null>;
}

export const PAYMENTS_ENABLED = false;

export { tossProvider } from "./toss";
