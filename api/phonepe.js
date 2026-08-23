/**
 * Vercel Serverless Function: /api/phonepe
 * 24/7 PhonePe Payment Webhook & Automated Shiprocket Fulfillment
 */

import { verifyPhonePeChecksum, VERIFIED_PAYMENTS } from './lib/phonepe.js';
import { createShiprocketOrder } from './lib/shiprocket.js';
import { sendWhatsAppMessage } from './lib/whatsapp.js';
import { getProductById } from './lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const xVerify = req.headers['x-verify'] || '';
    const body = req.body;
    const responsePayload = body?.response;

    let paymentData = {};
    if (typeof responsePayload === 'string') {
      const decodedJson = Buffer.from(responsePayload, 'base64').toString('utf8');
      paymentData = JSON.parse(decodedJson);
    } else {
      paymentData = body || {};
    }

    console.log('PhonePe Webhook Received:', JSON.stringify(paymentData, null, 2));

    const code = paymentData.code || paymentData.data?.responseCode;
    const merchantTransactionId = paymentData.data?.merchantTransactionId || paymentData.merchantTransactionId;
    const amount = (paymentData.data?.amount ? paymentData.data.amount / 100 : 599);

    if (code === 'PAYMENT_SUCCESS' || code === 'SUCCESS') {
      console.log(`🎉 PAYMENT SUCCESSFUL for Order: ${merchantTransactionId} (₹${amount})`);
      VERIFIED_PAYMENTS.set(merchantTransactionId, paymentData);

      // Extract metadata / customer details from transaction ID or session
      // In production, fetch order details by transaction ID
      const customerPhone = paymentData.data?.customerPhone || '919876543210';
      const customerName = paymentData.data?.customerName || 'Aarav Sharma';
      const address = paymentData.data?.address || 'Flat 402, Palm Heights, MG Road';
      const city = paymentData.data?.city || 'Bengaluru';
      const state = paymentData.data?.state || 'Karnataka';
      const pincode = paymentData.data?.pincode || '560001';
      const product = getProductById('ganesha');

      // 1. Automatically Create Shiprocket Order & Assign AWB
      console.log('Dispatching order to Shiprocket...');
      const shipment = await createShiprocketOrder({
        orderId: merchantTransactionId,
        customerName,
        customerPhone,
        customerEmail: 'viyonadesigns@gmail.com',
        address,
        city,
        state,
        pincode,
        product,
        amountPaid: amount
      });

      console.log('Shiprocket Result:', JSON.stringify(shipment, null, 2));

      // 2. Dispatch Confirmation & Tracking Link to Customer on WhatsApp
      const trackingMsg = `🎉 *Payment Confirmed! Thank You for Your Order!* 🌸\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🆔 *Order ID:* ${merchantTransactionId}\n` +
        `📦 *Item:* ${product.name}\n` +
        `💵 *Amount Paid:* ₹${amount}.00 (0% Extra Fees)\n` +
        `🚚 *Courier Partner:* Ekart Logistics Surface\n` +
        `🏷️ *AWB Tracking #:* ${shipment.awb_code || 'Assigned shortly'}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📍 *Live Tracking Link:*\n${shipment.tracking_url || 'https://shiprocket.co/tracking/' + shipment.awb_code}\n\n` +
        `Your piece is being packaged in our studio with our sacred blessing card. We will notify you when it is out for delivery! 🙏✨`;

      await sendWhatsAppMessage({ to: customerPhone, message: trackingMsg });

      return res.status(200).json({ status: 'fulfilled', shipment });
    }

    return res.status(200).json({ status: 'ignored', code });
  } catch (err) {
    console.error('PhonePe Webhook Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
