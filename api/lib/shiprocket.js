/**
 * Shiprocket Serverless Helper for Vercel
 */

const SHIPROCKET_API_BASE = 'https://apiv2.shiprocket.in/v1/external';
let cachedToken = null;
let tokenExpiry = 0;

export async function getShiprocketToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry > now + 300) {
    return cachedToken;
  }

  const email = process.env.SHIPROCKET_EMAIL || 'support@viyonadesigns.com';
  const password = process.env.SHIPROCKET_PASSWORD || 'Qyx43G%n6PYw6HFi0xsr^hl051bZN9Bl';

  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD not configured');
  }

  const res = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (data.token) {
    cachedToken = data.token;
    tokenExpiry = now + 86400;
    return cachedToken;
  }
  throw new Error(`Shiprocket auth failed: ${JSON.stringify(data)}`);
}

export async function checkPincodeServiceability(deliveryPincode, weightKg = 0.4) {
  const token = await getShiprocketToken();
  const url = `${SHIPROCKET_API_BASE}/courier/serviceability/?pickup_postcode=205001&delivery_postcode=${deliveryPincode}&weight=${weightKg}&cod=0`;
  
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  const data = await res.json();
  
  if (data.status === 200 && data.data?.available_courier_companies?.length > 0) {
    const couriers = data.data.available_courier_companies;
    const topCourier = couriers.find(c => c.courier_name.toLowerCase().includes('ekart')) || couriers[0];
    return {
      serviceable: true,
      city: topCourier.city,
      state: topCourier.state,
      estimated_days: topCourier.estimated_delivery_days,
      delivery_date: topCourier.etd,
      courier_name: topCourier.courier_name,
      rate: topCourier.rate
    };
  }
  return { serviceable: false };
}

export async function createShiprocketOrder({
  orderId,
  customerName,
  customerPhone,
  customerEmail,
  address,
  city,
  state,
  pincode,
  product,
  amountPaid
}) {
  const token = await getShiprocketToken();
  const names = (customerName || 'Customer').trim().split(' ');
  const firstName = names[0];
  const lastName = names.slice(1).join(' ') || 'Customer';

  const payload = {
    order_id: orderId,
    order_date: new Date().toISOString().replace('T', ' ').slice(0, 19),
    pickup_location: 'work',
    comment: 'Direct WhatsApp Commerce Order - Viyona Designs',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: address,
    billing_city: city,
    billing_pincode: pincode,
    billing_state: state,
    billing_country: 'India',
    billing_email: customerEmail || 'viyonadesigns@gmail.com',
    billing_phone: customerPhone.replace(/\D/g, '').slice(-10),
    shipping_is_billing: true,
    order_items: [
      {
        name: product.name,
        sku: product.sku,
        units: 1,
        selling_price: amountPaid,
        discount: 0,
        tax: 0
      }
    ],
    payment_method: 'Prepaid',
    shipping_charges: 0,
    total_discount: 0,
    sub_total: amountPaid,
    length: product.length_cm,
    breadth: product.breadth_cm,
    height: product.height_cm,
    weight: product.weight_kg
  };

  const res = await fetch(`${SHIPROCKET_API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const orderData = await res.json();
  const shipmentId = orderData.shipment_id;

  // Auto assign AWB (Ekart ID 54 or recommended)
  let awbCode = '';
  try {
    const awbRes = await fetch(`${SHIPROCKET_API_BASE}/courier/assign/awb`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipment_id: shipmentId, courier_id: 54 })
    });
    const awbData = await awbRes.json();
    awbCode = awbData.response?.data?.awb_code || '';
  } catch (e) {
    console.error('AWB auto-assign error:', e.message);
  }

  return {
    order_id: orderData.order_id,
    shipment_id: shipmentId,
    awb_code: awbCode,
    tracking_url: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : ''
  };
}
