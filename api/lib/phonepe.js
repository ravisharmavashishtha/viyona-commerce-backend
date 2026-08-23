/**
 * PhonePe Serverless Helper for Vercel
 * Generates UPI Deep Links, Dynamic QR Codes, and verifies payment webhooks
 */

import crypto from 'node:crypto';

const MERCHANT_VPA = process.env.PHONEPE_MERCHANT_VPA || 'viyonadesigns@ybl'; // Or your PhonePe Business VPA
const MERCHANT_NAME = 'Viyona Designs';

/**
 * Generates a dynamic UPI Deep Link that directly opens PhonePe / GPay / Paytm / BHIM
 * with the exact order ID, amount, and note pre-filled!
 */
export function generateUpiPaymentLink({ orderId, amount, productName }) {
  const cleanNote = `Order ${orderId} - ${productName}`.slice(0, 30);
  const upiUri = `upi://pay?pa=${encodeURIComponent(MERCHANT_VPA)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${amount.toFixed(2)}&cu=INR&tr=${encodeURIComponent(orderId)}&tn=${encodeURIComponent(cleanNote)}`;
  
  // Standard dynamic QR URL using QuickChart / Google Charts QR generator (zero API key needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

  return {
    upi_uri: upiUri,
    qr_image_url: qrUrl,
    amount,
    merchant_vpa: MERCHANT_VPA
  };
}

/**
 * Validates PhonePe PG Webhook Checksum (X-VERIFY)
 */
export function verifyPhonePeChecksum(base64Payload, xVerifyHeader, saltKey, saltIndex = 1) {
  if (!saltKey) return true; // Skip checksum in dev/test mode if key not provided yet
  const calculatedSha = crypto.createHash('sha256').update(base64Payload + saltKey).digest('hex');
  const expectedHeader = `${calculatedSha}###${saltIndex}`;
  return xVerifyHeader === expectedHeader;
}
