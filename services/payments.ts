// REPLACE: wire Razorpay SDK once user provides EXPO_PUBLIC_RAZORPAY_KEY_ID. Section 5 task 10.
//
// Until then, `startPayment` throws PAYMENT_GATEWAY_NOT_CONFIGURED so the UI
// can show a "coming soon" alert. The shape of the resolved promise is the
// shape we will return once Razorpay is wired in:
//
//   { paymentId: string }       — the Razorpay payment_id (or our own server
//                                  reference once we add the webhook in
//                                  Section 5 task 6).
//
// The cash path does not flow through this module; callers fire the existing
// "complete ride / mark cash paid" flow directly.

export type PaymentResult = {
  paymentId: string;
};

export async function startPayment(_rideId: string, _amountInr: number): Promise<PaymentResult> {
  throw new Error('PAYMENT_GATEWAY_NOT_CONFIGURED');
}
