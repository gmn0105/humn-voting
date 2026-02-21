/**
 * In-memory store for payment intents (invoices).
 * For production, replace with database (e.g. Supabase table).
 */
export interface PaymentIntent {
  invoice: string;
  alienId: string;
  amount: string;
  token: string;
  network: string;
  recipient: string;
  status: "pending" | "finalized" | "failed";
  createdAt: number;
}

const store = new Map<string, PaymentIntent>();

export function createPaymentIntent(
  invoice: string,
  alienId: string,
  amount: string,
  token: string,
  network: string,
  recipient: string,
): PaymentIntent {
  const intent: PaymentIntent = {
    invoice,
    alienId,
    amount,
    token,
    network,
    recipient,
    status: "pending",
    createdAt: Date.now(),
  };
  store.set(invoice, intent);
  return intent;
}

export function getPaymentIntent(invoice: string): PaymentIntent | undefined {
  return store.get(invoice);
}

export function setPaymentIntentStatus(
  invoice: string,
  status: "finalized" | "failed",
  txHash?: string,
): void {
  const intent = store.get(invoice);
  if (intent) {
    intent.status = status;
    (intent as PaymentIntent & { txHash?: string }).txHash = txHash;
  }
}
