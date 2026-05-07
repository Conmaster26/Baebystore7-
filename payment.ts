import crypto from "crypto";

/**
 * PayFast Payment Gateway Integration
 * South African payment processor for credit/debit cards and EFT
 */

export interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  testMode?: boolean;
}

export interface PayFastPaymentData {
  amount: number;
  itemName: string;
  itemDescription: string;
  reference: string;
  email: string;
  customerName: string;
  customerPhone: string;
}

/**
 * Generate PayFast payment form data
 */
export function generatePayFastPayment(
  config: PayFastConfig,
  payment: PayFastPaymentData
): Record<string, string> {
  const baseUrl = config.testMode
    ? "https://sandbox.payfast.co.za"
    : "https://www.payfast.co.za";

  const data = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: config.returnUrl,
    cancel_url: config.cancelUrl,
    notify_url: config.notifyUrl,
    name_first: payment.customerName.split(" ")[0],
    name_last: payment.customerName.split(" ").slice(1).join(" "),
    email_address: payment.email,
    cell_number: payment.customerPhone,
    m_payment_id: payment.reference,
    amount: (payment.amount / 100).toFixed(2), // Convert cents to Rands
    item_name: payment.itemName,
    item_description: payment.itemDescription,
  };

  // Generate signature
  const signatureString = Object.entries(data)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const signature = crypto
    .createHash("md5")
    .update(signatureString)
    .digest("hex");

  return {
    ...data,
    signature,
    paymentUrl: `${baseUrl}/eng/process`,
  };
}

/**
 * Verify PayFast IPN (Instant Payment Notification)
 */
export function verifyPayFastIPN(
  config: PayFastConfig,
  data: Record<string, string>
): boolean {
  // Verify signature
  const signatureString = Object.entries(data)
    .filter(([key]) => key !== "signature")
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const expectedSignature = crypto
    .createHash("md5")
    .update(signatureString)
    .digest("hex");

  return data.signature === expectedSignature;
}

/**
 * Yoco Payment Gateway Integration
 * South African payment processor for cards and mobile money
 */

export interface YocoConfig {
  apiKey: string;
  secretKey: string;
  testMode?: boolean;
}

export interface YocoPaymentData {
  amount: number; // In cents
  currency: string;
  description: string;
  reference: string;
  customerEmail: string;
  customerPhone: string;
  successUrl: string;
  failureUrl: string;
}

/**
 * Create Yoco payment link
 */
export async function createYocoPaymentLink(
  config: YocoConfig,
  payment: YocoPaymentData
): Promise<{ paymentUrl: string; paymentId: string }> {
  const baseUrl = config.testMode
    ? "https://api.sandbox.yoco.com"
    : "https://api.yoco.com";

  const payload = {
    amount: payment.amount,
    currency: payment.currency,
    description: payment.description,
    reference: payment.reference,
    successUrl: payment.successUrl,
    failureUrl: payment.failureUrl,
    metadata: {
      customerEmail: payment.customerEmail,
      customerPhone: payment.customerPhone,
    },
  };

  try {
    const response = await fetch(`${baseUrl}/v1/checkout_sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Yoco API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      id: string;
      redirectUrl: string;
    };

    return {
      paymentUrl: data.redirectUrl,
      paymentId: data.id,
    };
  } catch (error) {
    console.error("[Yoco Payment Error]", error);
    throw error;
  }
}

/**
 * Verify Yoco webhook signature
 */
export function verifyYocoWebhook(
  secretKey: string,
  payload: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");

  return signature === expectedSignature;
}

/**
 * Calculate order totals with profit margin
 */
export interface OrderCalculation {
  subtotal: number; // Product cost from supplier
  profitMargin: number; // R150 per order
  shippingCost: number; // Estimated shipping
  tax: number; // VAT (15%)
  totalAmount: number; // Total customer pays
}

export function calculateOrderTotal(
  subtotal: number,
  profitMarginPerOrder: number = 150
): OrderCalculation {
  const shippingCost = 0; // Will be calculated based on destination
  const subtotalWithProfit = subtotal + profitMarginPerOrder;
  const tax = Math.round(subtotalWithProfit * 0.15 * 100) / 100; // 15% VAT
  const totalAmount = subtotalWithProfit + tax + shippingCost;

  return {
    subtotal,
    profitMargin: profitMarginPerOrder,
    shippingCost,
    tax,
    totalAmount,
  };
}

/**
 * Generate unique order number
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BAEBY-${timestamp}-${random}`;
}
