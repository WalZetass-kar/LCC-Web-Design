/**
 * Test Midtrans Service
 * Run: npx ts-node test-midtrans.ts
 */

import 'dotenv/config'
import midtransService from './src/backend/services/midtransService'

async function testMidtransService() {
  console.log('🧪 Testing Midtrans Service...\n')

  // Test 1: Check configuration
  console.log('1️⃣ Checking Midtrans Configuration...')
  const configStatus = midtransService.getConfigStatus()
  console.log('Config Status:', configStatus)
  
  if (!configStatus.configured) {
    console.error('\n❌ Midtrans not configured!')
    console.error('Please set MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY in .env file')
    console.error('\nSteps:')
    console.error('1. Copy .env.example to .env')
    console.error('2. Register at https://dashboard.midtrans.com/register')
    console.error('3. Get your API keys from Settings → Access Keys')
    console.error('4. Fill in the keys in .env file')
    process.exit(1)
  }
  
  console.log('✅ Midtrans configured!\n')

  // Test 2: Create Snap Transaction
  console.log('2️⃣ Testing Snap Transaction...')
  try {
    const orderId = `TEST-SNAP-${Date.now()}`
    const snapResult = await midtransService.createSnapTransaction({
      orderId: orderId,
      grossAmount: 10000,
      customerDetails: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '08123456789',
      },
      itemDetails: [
        {
          id: 'ITEM1',
          name: 'Test Product',
          price: 10000,
          quantity: 1,
        },
      ],
    })

    console.log('✅ Snap Transaction Created!')
    console.log('Order ID:', orderId)
    console.log('Token:', snapResult.token)
    console.log('Redirect URL:', snapResult.redirectUrl)
    console.log('')
  } catch (error: any) {
    console.error('❌ Snap Transaction Failed:', error.message)
    console.log('')
  }

  // Test 3: Create QRIS Transaction
  console.log('3️⃣ Testing QRIS Transaction...')
  try {
    const orderId = `TEST-QRIS-${Date.now()}`
    const qrisResult = await midtransService.createQRISTransaction({
      orderId: orderId,
      grossAmount: 15000,
      customerDetails: {
        firstName: 'Test',
        lastName: 'QRIS',
        email: 'qris@example.com',
        phone: '08123456789',
      },
      itemDetails: [
        {
          id: 'ITEM2',
          name: 'QRIS Test Product',
          price: 15000,
          quantity: 1,
        },
      ],
    })

    console.log('✅ QRIS Transaction Created!')
    console.log('Order ID:', orderId)
    console.log('Transaction ID:', qrisResult.transactionId)
    console.log('QR Code URL:', qrisResult.qrCodeUrl)
    console.log('Expiry Time:', qrisResult.expiryTime)
    console.log('')
  } catch (error: any) {
    console.error('❌ QRIS Transaction Failed:', error.message)
    console.log('')
  }

  // Test 4: Create GoPay Transaction
  console.log('4️⃣ Testing GoPay Transaction...')
  try {
    const orderId = `TEST-GOPAY-${Date.now()}`
    const gopayResult = await midtransService.createGoPayTransaction({
      orderId: orderId,
      grossAmount: 20000,
      customerDetails: {
        firstName: 'Test',
        lastName: 'GoPay',
        email: 'gopay@example.com',
        phone: '08123456789',
      },
      itemDetails: [
        {
          id: 'ITEM3',
          name: 'GoPay Test Product',
          price: 20000,
          quantity: 1,
        },
      ],
    })

    console.log('✅ GoPay Transaction Created!')
    console.log('Order ID:', orderId)
    console.log('Transaction ID:', gopayResult.transactionId)
    console.log('Deeplink URL:', gopayResult.deeplinkUrl)
    console.log('QR Code URL:', gopayResult.qrCodeUrl)
    console.log('Expiry Time:', gopayResult.expiryTime)
    console.log('')
  } catch (error: any) {
    console.error('❌ GoPay Transaction Failed:', error.message)
    console.log('')
  }

  // Test 5: Create Virtual Account Transaction
  console.log('5️⃣ Testing Virtual Account (BCA)...')
  try {
    const orderId = `TEST-VA-${Date.now()}`
    const vaResult = await midtransService.createVATransaction(
      {
        orderId: orderId,
        grossAmount: 25000,
        customerDetails: {
          firstName: 'Test',
          lastName: 'VA',
          email: 'va@example.com',
          phone: '08123456789',
        },
        itemDetails: [
          {
            id: 'ITEM4',
            name: 'VA Test Product',
            price: 25000,
            quantity: 1,
          },
        ],
      },
      'bca'
    )

    console.log('✅ Virtual Account Created!')
    console.log('Order ID:', orderId)
    console.log('Transaction ID:', vaResult.transactionId)
    console.log('Bank:', vaResult.bank)
    console.log('VA Number:', vaResult.vaNumber)
    console.log('Expiry Time:', vaResult.expiryTime)
    console.log('')
  } catch (error: any) {
    console.error('❌ Virtual Account Failed:', error.message)
    console.log('')
  }

  // Test 6: Signature Verification
  console.log('6️⃣ Testing Signature Verification...')
  const testOrderId = 'TEST-ORDER-123'
  const testStatusCode = '200'
  const testGrossAmount = '10000.00'
  const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
  
  // Create expected signature
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHash('sha512')
    .update(testOrderId + testStatusCode + testGrossAmount + serverKey)
    .digest('hex')

  const isValid = midtransService.verifySignature(
    testOrderId,
    testStatusCode,
    testGrossAmount,
    expectedSignature
  )

  if (isValid) {
    console.log('✅ Signature Verification Works!')
  } else {
    console.log('❌ Signature Verification Failed!')
  }
  console.log('')

  // Summary
  console.log('═══════════════════════════════════════')
  console.log('🎉 Midtrans Service Test Complete!')
  console.log('═══════════════════════════════════════')
  console.log('')
  console.log('Next Steps:')
  console.log('1. Check the results above')
  console.log('2. If all tests pass, you can proceed with implementation')
  console.log('3. Follow PREMIUM_FEATURES_IMPLEMENTATION_GUIDE.md')
  console.log('4. Create Models, Controllers, and UI components')
  console.log('')
  console.log('Note: Transactions created in sandbox mode will not charge real money')
  console.log('')
}

// Run tests
testMidtransService().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
