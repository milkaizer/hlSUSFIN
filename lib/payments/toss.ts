import type { PaymentProvider } from "./index";

// 토스페이먼츠 자리. 정식 런칭 전까지 동작하지 않는다
export const tossProvider: PaymentProvider = {
  name: "toss",
  async createCheckout() {
    throw new Error("payments_not_enabled");
  },
  async verifyWebhook() {
    return null;
  },
};
