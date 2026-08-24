/**
 * Vercel Serverless Function: /api/create-order
 * Creates a Razorpay Order for Standard Web Checkout
 */

import { getRazorpayInstance } from './lib/razorpay.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let razorpay;
    try {
      razorpay = getRazorpayInstance();
    } catch (authErr) {
      console.error('Razorpay Auth/Config Error:', authErr.message);
      return res.status(401).json({
        error: 'Authentication failed: Razorpay credentials are not configured or invalid',
        details: authErr.message
      });
    }

    const { amount, currency = 'INR', receipt, notes } = req.body || {};

    // Validate amount
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Minimum order amount is 100 paise (₹1.00).'
      });
    }

    const receiptId = receipt || `rcpt_${Date.now().toString().slice(-8)}`;

    const options = {
      amount: parsedAmount, // amount in smallest currency unit (paise)
      currency: currency.toUpperCase(),
      receipt: receiptId,
      notes: notes || {}
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error('Razorpay Create Order Error:', err);

    // Handle authentication/permission errors from Razorpay API
    if (err.statusCode === 401 || err.error?.code === 'BAD_REQUEST_ERROR') {
      return res.status(err.statusCode || 400).json({
        error: err.error?.description || err.message || 'Razorpay order creation failed',
        code: err.error?.code
      });
    }

    return res.status(500).json({
      error: 'Failed to create Razorpay order',
      message: err.message || 'Internal server error'
    });
  }
}
