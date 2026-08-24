/**
 * Razorpay Helper Module for Viyona Commerce Backend
 * Encapsulates Razorpay SDK instance and HMAC-SHA256 signature verification
 */

import Razorpay from 'razorpay';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes and returns a Razorpay SDK instance
 */
export function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials missing. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
  }

  return new Razorpay({
    key_id,
    key_secret
  });
}

/**
 * Verifies Razorpay Payment Signature
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 * 
 * @param {string} orderId - Razorpay Order ID (e.g. order_9A33XWu170gUtm)
 * @param {string} paymentId - Razorpay Payment ID (e.g. pay_29QQoUBcxQtvjb)
 * @param {string} signature - Razorpay Signature from frontend checkout
 * @returns {boolean} - true if signature matches, false otherwise
 */
export function verifyRazorpaySignature(orderId, paymentId, signature) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error('RAZORPAY_KEY_SECRET is not configured in environment variables');
  }

  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    return expectedSignature === signature;
  }
}
