/**
 * Vercel Serverless Function: /api/whatsapp
 * 24/7 Meta WhatsApp Cloud API Webhook & Conversational Order Flow
 */

import { PRODUCTS, getProductById } from './lib/catalog.js';
import { checkPincodeServiceability, createShiprocketOrder } from './lib/shiprocket.js';
import { generateUpiPaymentLink } from './lib/phonepe.js';
import { sendWhatsAppMessage, sendWhatsAppImage } from './lib/whatsapp.js';
import { getSession, updateSession, clearSession } from './lib/session.js';

export default async function handler(req, res) {
  // 1. Meta Webhook Verification Handshake (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'viyona_secret_token_2026';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp Webhook Verified successfully!');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden: Token mismatch');
  }

  // 2. Handle Incoming Customer Messages (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const entry = body?.entry?.[0];
      const changes = entry?.changes?.[0]?.value;
      const message = changes?.messages?.[0];

      if (!message) {
        return res.status(200).json({ status: 'no_message' });
      }

      const from = message.from; // Customer phone number (e.g. "919162691143")
      const text = message.text?.body?.trim() || '';
      const session = getSession(from);

      console.log(`[WA BOT] Message from ${from}: "${text}" (Current Stage: ${session.stage})`);

      // === BOT STATE MACHINE ===

      // Reset / Restart Flow
      if (text.toLowerCase() === 'hi' || text.toLowerCase() === 'hello' || text.toLowerCase() === 'menu' || text.toLowerCase() === 'restart' || session.stage === 'INIT') {
        updateSession(from, { stage: 'CATALOG_SENT' });

        const catalogMsg = `🌸 *Welcome to Viyona Designs Smart Studio!* 🌸\n` +
          `Artisan 3D Sculpted Decor & Sacred Creations from India 🇮🇳\n\n` +
          `✨ *Popular Studio Creations:* ✨\n` +
          `1️⃣ *Matte White Lord Ganesha Idol* — ₹599 (MRP ~₹1199~)\n` +
          `   _0.08mm Layer Precision • Car Dashboard & Mandir Edition_\n\n` +
          `2️⃣ *Cute Sleeping Puppy Desk Tray* — ₹499 (MRP ~₹899~)\n` +
          `   _Artisan Key & Ring Catchall Desk Decor_\n\n` +
          `3️⃣ *Multi-Angle Phone Stand* — ₹299 (MRP ~₹599~)\n` +
          `   _Ergonomic Desk Cradle with Cable Pass_\n\n` +
          `👉 *Reply with 1, 2, or 3 to order or view details!*`;

        await sendWhatsAppMessage({ to: from, message: catalogMsg });
        return res.status(200).json({ status: 'catalog_sent' });
      }

      // Stage 1: Product Selection
      if (session.stage === 'CATALOG_SENT') {
        let product = null;
        if (text === '1' || text.toLowerCase().includes('ganesha')) product = PRODUCTS.ganesha;
        else if (text === '2' || text.toLowerCase().includes('puppy')) product = PRODUCTS.puppy;
        else if (text === '3' || text.toLowerCase().includes('stand') || text.toLowerCase().includes('phone')) product = PRODUCTS.phonestand;

        if (product) {
          const orderId = `VD-${Date.now().toString().slice(-6)}`;
          updateSession(from, {
            stage: 'AWAITING_ADDRESS',
            selectedProduct: product,
            orderId,
            amount: product.price
          });

          const productCard = `🕉️ *${product.name}*\n` +
            `_${product.subtitle}_\n\n` +
            `💰 *Direct Studio Price:* ₹${product.price} (Free Pan-India Delivery)\n` +
            `📐 *Dimensions:* ${product.dimensions}\n` +
            `🌱 *Material:* ${product.material}\n` +
            `✨ *Includes:* 4x4" Gold Blessing Card & 3M Dashboard Mount\n\n` +
            `📍 *To proceed with your order, please send your Delivery Address as follows:*\n\n` +
            `*Full Name:*\n` +
            `*Complete Address:*\n` +
            `*City:*\n` +
            `*State:*\n` +
            `*Pincode (6 digits):*`;

          await sendWhatsAppMessage({ to: from, message: productCard });
          return res.status(200).json({ status: 'address_requested' });
        } else {
          await sendWhatsAppMessage({
            to: from,
            message: `Please reply with *1* for Ganesha Idol, *2* for Puppy Tray, or *3* for Phone Stand. 🙏`
          });
          return res.status(200).json({ status: 'invalid_choice' });
        }
      }

      // Stage 2: Address Collection & Live Pincode Check
      if (session.stage === 'AWAITING_ADDRESS') {
        // Extract 6-digit Indian pincode from message
        const pincodeMatch = text.match(/\b[1-9][0-9]{5}\b/);
        const pincode = pincodeMatch ? pincodeMatch[0] : null;

        if (!pincode) {
          await sendWhatsAppMessage({
            to: from,
            message: `⚠️ We couldn't detect a 6-digit Pincode in your message. Please include your 6-digit delivery pincode (e.g. 560001 or 110001).`
          });
          return res.status(200).json({ status: 'pincode_missing' });
        }

        // Live Serviceability Check with Shiprocket
        let etaText = '2-3 Business Days';
        try {
          const service = await checkPincodeServiceability(pincode, session.selectedProduct.weight_kg);
          if (service.serviceable) {
            etaText = `${service.estimated_days} Days (via ${service.courier_name || 'Express Courier'})`;
          }
        } catch (e) {
          console.error('Serviceability check failed:', e.message);
        }

        // Generate Dynamic PhonePe UPI Payment Link & QR Code
        const upiData = generateUpiPaymentLink({
          orderId: session.orderId,
          amount: session.amount,
          productName: session.selectedProduct.name
        });

        updateSession(from, {
          stage: 'PAYMENT_PENDING',
          address: text,
          pincode,
          upiUri: upiData.upi_uri
        });

        const billSummary = `🧾 *Order Summary — Viyona Designs* 🧾\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `📦 *Item:* ${session.selectedProduct.name}\n` +
          `💵 *Total Amount:* ₹${session.amount}.00\n` +
          `🚚 *Shipping:* FREE Pan-India (${etaText})\n` +
          `📍 *Delivering to:* Pincode ${pincode}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `💳 *Pay securely via PhonePe / GPay / Paytm:* 💳\n\n` +
          `👉 *Tap to Pay with UPI App:*\n${upiData.upi_uri}\n\n` +
          `_Or scan your QR code sent below._\n\n` +
          `Once payment is complete, your shipment will be automatically booked with Ekart/Delhivery and your tracking link will be sent here! ✨`;

        await sendWhatsAppImage({
          to: from,
          imageUrl: upiData.qr_image_url,
          caption: billSummary
        });

        return res.status(200).json({ status: 'payment_link_sent' });
      }

      // Stage 3: Payment Pending / Customer asks for status
      if (session.stage === 'PAYMENT_PENDING') {
        if (text.toLowerCase().includes('done') || text.toLowerCase().includes('paid') || text.toLowerCase().includes('status')) {
          await sendWhatsAppMessage({
            to: from,
            message: `🔍 Checking payment confirmation with PhonePe for Order *${session.orderId}*... As soon as UPI verifies the transfer, your Shiprocket tracking link will be generated automatically! ⚡`
          });
          return res.status(200).json({ status: 'payment_checking' });
        }
      }

      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error('Webhook error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
