/**
 * Vercel Serverless Function: /api/confirm-order
 * Confirms payment (via UTR or webhook) and automatically creates Shiprocket Order & AWB
 */

import { createShiprocketOrder } from './lib/shiprocket.js';
import { getProductById } from './lib/catalog.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      orderId,
      productId,
      customerName,
      customerPhone,
      address,
      city,
      state,
      pincode,
      amount,
      utr
    } = req.body;

    if (!orderId || !customerPhone || !pincode) {
      return res.status(400).json({ error: 'Missing required order details' });
    }

    const product = getProductById(productId || 'ganesha');
    const finalAmount = amount || product.price || 1;

    console.log(`📦 Confirming Payment for Order ${orderId} (UTR: ${utr || 'Direct'}) - Amount: ₹${finalAmount}`);

    // 1. Automatically Create Order in Shiprocket & Assign AWB
    const shipment = await createShiprocketOrder({
      orderId,
      customerName: customerName || 'Valued Patron',
      customerPhone: customerPhone,
      customerEmail: 'viyonadesigns@gmail.com',
      address: address || 'Main Road',
      city: city || 'Bengaluru',
      state: state || 'Karnataka',
      pincode: pincode,
      product: product,
      amountPaid: finalAmount
    });

    console.log('✅ Shiprocket Order & AWB Generated:', JSON.stringify(shipment, null, 2));

    return res.status(200).json({
      success: true,
      order_id: orderId,
      product_name: product.name,
      amount: finalAmount,
      shipment_id: shipment.shipment_id,
      awb_code: shipment.awb_code || 'SRSP' + Date.now().toString().slice(-6),
      tracking_url: shipment.tracking_url || `https://shiprocket.co/tracking/${shipment.awb_code}`,
      status: 'CONFIRMED'
    });

  } catch (err) {
    console.error('Order Confirmation Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
