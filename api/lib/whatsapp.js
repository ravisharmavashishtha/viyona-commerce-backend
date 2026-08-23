/**
 * WhatsApp Cloud API Serverless Helper for Vercel
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

export async function sendWhatsAppMessage({ to, message }) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[DEV MODE] WhatsApp message to ${to}:\n${message}`);
    return { success: true, mode: 'mock' };
  }

  const cleanPhone = to.replace(/\D/g, '');
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: { preview_url: true, body: message }
    })
  });

  return await res.json();
}

export async function sendWhatsAppImage({ to, imageUrl, caption }) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    console.log(`[DEV MODE] WhatsApp Image to ${to}: ${imageUrl} | Caption: ${caption}`);
    return { success: true, mode: 'mock' };
  }

  const cleanPhone = to.replace(/\D/g, '');
  const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'image',
      image: { link: imageUrl, caption }
    })
  });

  return await res.json();
}
