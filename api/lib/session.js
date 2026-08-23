/**
 * In-Memory & Cloud Session Store for WhatsApp Customer Orders
 */

const SESSIONS = new Map();

export function getSession(phoneNumber) {
  const clean = phoneNumber.replace(/\D/g, '');
  if (!SESSIONS.has(clean)) {
    SESSIONS.set(clean, {
      phone: clean,
      stage: 'INIT',
      selectedProduct: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      orderId: null,
      amount: 0,
      createdAt: Date.now()
    });
  }
  return SESSIONS.get(clean);
}

export function updateSession(phoneNumber, updates) {
  const session = getSession(phoneNumber);
  const updated = { ...session, ...updates, updatedAt: Date.now() };
  SESSIONS.set(phoneNumber.replace(/\D/g, ''), updated);
  return updated;
}

export function clearSession(phoneNumber) {
  SESSIONS.delete(phoneNumber.replace(/\D/g, ''));
}
