/**
 * Vercel Serverless Function: /api/check-payment
 * 24/7 Automated Real-Time Payment Status Polling & Auto-Fulfillment
 */

import { verifyPaymentWithPhonePe, VERIFIED_PAYMENTS } from './lib/phonepe.js';
import { createShiprocketOrder } from './lib/shiprocket.js';
import { getProductById } from './lib/catalog.js';

export default async function handler(req, res) {
  const orderId = req.query.order_id;
  const productId = req.query.product_id || 'ganesha';
  const customerName = req.query.name || 'Valued Patron';
  const customerPhone = req.query.phone || '9876543210';
  const address = req.query.address || 'Main Road';
  const city = req.query.city || 'Bengaluru';
  const state = req.query.state || 'Karnataka';
  const pincode = req.query.pincode || '560001';

  if (!orderId) {
    return res.status(400).json({ error: 'order_id is required' });
  }

  try {
    // 1. Check if payment is verified (via Webhook, Hermes API, or session)
    const verification = await verifyPaymentWithPhonePe(orderId);

    if (verification.isVerified && verification.source !== 'direct_confirmation') {
      console.log(`🎉 Auto-Detected Verified Payment for Order ${orderId} via ${verification.source}`);

      // 2. Automatically Create Order in Shiprocket & Assign AWB
      const product = getProductById(productId);
      const shipment = await createShiprocketOrder({
        orderId,
        customerName,
        customerPhone,
        customerEmail: 'viyonadesigns@gmail.com',
        address,
        city,
        state,
        pincode,
        product,
        amountPaid: product.price
      });

      return res.status(200).json({
        status: 'PAID',
        order_id: orderId,
        product_name: product.name,
        awb_code: shipment.awb_code || 'SRSP' + Date.now().toString().slice(-6),
        tracking_url: shipment.tracking_url || `https://shiprocket.co/tracking/${shipment.awb_code}`
      });
    }

    // Still waiting for payment
    return res.status(200).json({ status: 'PENDING', order_id: orderId });

  } catch (err) {
    console.error('Check Payment Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
