/**
 * Vercel Serverless Function: /api/health
 * 24/7 Service Health Check
 */

export default function handler(req, res) {
  return res.status(200).json({
    status: 'healthy',
    service: 'viyona-commerce-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_sla: '99.99%',
    endpoints: [
      { name: 'WhatsApp Cloud Webhook', path: '/api/whatsapp' },
      { name: 'PhonePe Payment Webhook', path: '/api/phonepe' },
      { name: 'Shiprocket Live Tracking', path: '/api/track' }
    ]
  });
}
