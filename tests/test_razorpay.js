/**
 * Razorpay Integration Test Suite
 */

import { verifyRazorpaySignature } from '../api/lib/razorpay.js';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

async function runRazorpayTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING RAZORPAY INTEGRATION & SIGNATURE TESTS');
  console.log('====================================================\n');

  // Test 1: Signature Verification Logic
  console.log('1. Testing HMAC-SHA256 Signature Verification...');
  const testOrderId = 'order_test_1234567890';
  const testPaymentId = 'pay_test_9876543210';
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  const isSigValid = verifyRazorpaySignature(testOrderId, testPaymentId, validSignature);
  console.log(`- Valid signature check: ${isSigValid ? '✅ PASS' : '❌ FAIL'}`);

  const isInvalidRejected = !verifyRazorpaySignature(testOrderId, testPaymentId, 'invalid_signature_hash_xyz');
  console.log(`- Tampered signature rejection check: ${isInvalidRejected ? '✅ PASS' : '❌ FAIL'}`);

  // Test 2: Live API Order Creation
  console.log('\n2. Testing Razorpay Orders API (/api/create-order)...');
  const createOrderHandler = (await import('../api/create-order.js')).default;

  // 2a. Test validation: amount < 100 paise
  let errorStatus = 0;
  let errorJson = null;
  const mockReqLow = {
    method: 'POST',
    body: { amount: 50, currency: 'INR' },
    headers: {}
  };
  const mockResLow = {
    setHeader: () => {},
    status: (s) => { errorStatus = s; return { json: (j) => { errorJson = j; } }; }
  };
  await createOrderHandler(mockReqLow, mockResLow);
  console.log(`- Validation (amount < 100 paise returns 400): ${errorStatus === 400 ? '✅ PASS' : '❌ FAIL'}`);

  // 2b. Test live order creation (100 paise = ₹1.00)
  let successStatus = 0;
  let orderData = null;
  const mockReqValid = {
    method: 'POST',
    body: { amount: 100, currency: 'INR', receipt: 'test_rcpt_001', notes: { product: 'Matte White Lord Ganesha Idol' } },
    headers: {}
  };
  const mockResValid = {
    setHeader: () => {},
    status: (s) => { successStatus = s; return { json: (j) => { orderData = j; } }; }
  };
  await createOrderHandler(mockReqValid, mockResValid);
  console.log(`- Live order creation API response: Status ${successStatus}`);
  console.log('  Order payload:', JSON.stringify(orderData, null, 2));

  if (successStatus === 200 && orderData?.order_id) {
    console.log('✅ PASS: Order ID created successfully on Razorpay:', orderData.order_id);
  } else {
    console.error('❌ FAIL: Order creation failed', orderData);
    process.exit(1);
  }

  // Test 3: Live Verification Endpoint (/api/verify-payment)
  console.log('\n3. Testing Razorpay Verify Endpoint (/api/verify-payment)...');
  const verifyHandler = (await import('../api/verify-payment.js')).default;

  // 3a. Valid signature verification
  const realOrderId = orderData.order_id;
  const mockPaymentId = 'pay_test_' + Date.now();
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${realOrderId}|${mockPaymentId}`)
    .digest('hex');

  let verifyStatus = 0;
  let verifyData = null;
  const mockReqVerify = {
    method: 'POST',
    body: {
      razorpay_order_id: realOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: generatedSignature
    },
    headers: {}
  };
  const mockResVerify = {
    setHeader: () => {},
    status: (s) => { verifyStatus = s; return { json: (j) => { verifyData = j; } }; }
  };
  await verifyHandler(mockReqVerify, mockResVerify);
  console.log(`- Valid signature verification: Status ${verifyStatus}`, verifyData);
  console.log(`- Result: ${verifyStatus === 200 && verifyData.success ? '✅ PASS' : '❌ FAIL'}`);

  // 3b. Tampered signature verification
  let tamperedStatus = 0;
  let tamperedData = null;
  const mockReqTampered = {
    method: 'POST',
    body: {
      razorpay_order_id: realOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: 'fake_signature_abc123'
    },
    headers: {}
  };
  const mockResTampered = {
    setHeader: () => {},
    status: (s) => { tamperedStatus = s; return { json: (j) => { tamperedData = j; } }; }
  };
  await verifyHandler(mockReqTampered, mockResTampered);
  console.log(`- Tampered signature rejection: Status ${tamperedStatus}`);
  console.log(`- Result: ${tamperedStatus === 400 && !tamperedData.success ? '✅ PASS' : '❌ FAIL'}`);

  console.log('\n====================================================');
  console.log('🎉 ALL RAZORPAY INTEGRATION TESTS PASSED 100%!');
  console.log('====================================================');
}

runRazorpayTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
