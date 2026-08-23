/**
 * Vercel Serverless Function: /api/track
 * Real-time shipment tracking for customers & website lookup
 */

import { getShiprocketToken } from './lib/shiprocket.js';

export default async function handler(req, res) {
  const awb = req.query.awb || req.query.tracking_id;
  const orderId = req.query.order_id;

  if (!awb && !orderId) {
    return res.status(400).json({ error: 'Provide awb or order_id parameter' });
  }

  try {
    const token = await getShiprocketToken();
    const query = awb ? `awb/${awb}` : `orders/details/${orderId}`;
    const srRes = await fetch(`https://apiv2.shiprocket.in/v1/external/courier/track/${query}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await srRes.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
