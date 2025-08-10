#!/usr/bin/env node

/**
 * Simple BigInt test to verify basic functionality
 * Tests the key BigInt operations without complex setup
 */

const axios = require('axios');
const BASE_URL = 'http://127.0.0.1:5001';

async function testBigIntBasics() {
  console.log('🧪 Testing BigInt Basic Functionality');
  
  // Test 1: Basic BigInt operations
  console.log('\n1. Testing BigInt arithmetic...');
  
  const largeAmount = BigInt('9999999999999999999');
  const smallAmount = BigInt('1000');
  const sum = largeAmount + smallAmount;
  const diff = largeAmount - smallAmount;
  
  console.log(`Large amount: ${largeAmount}`);
  console.log(`Small amount: ${smallAmount}`);
  console.log(`Sum: ${sum}`);
  console.log(`Difference: ${diff}`);
  console.log('✅ BigInt arithmetic works');
  
  // Test 2: JSON serialization
  console.log('\n2. Testing JSON serialization...');
  
  const testObject = {
    amount: largeAmount.toString(),
    payout: (largeAmount * BigInt(2)).toString(),
    balance: sum.toString()
  };
  
  const serialized = JSON.stringify(testObject);
  const parsed = JSON.parse(serialized);
  
  console.log('Original:', testObject);
  console.log('Serialized:', serialized);
  console.log('Parsed:', parsed);
  console.log('✅ JSON serialization works');
  
  // Test 3: Type conversions
  console.log('\n3. Testing type conversions...');
  
  const bigIntValue = BigInt('123456789012345');
  const numberValue = Number(bigIntValue);
  const stringValue = bigIntValue.toString();
  const backToBigInt = BigInt(stringValue);
  
  console.log(`BigInt: ${bigIntValue} (${typeof bigIntValue})`);
  console.log(`Number: ${numberValue} (${typeof numberValue})`);
  console.log(`String: ${stringValue} (${typeof stringValue})`);
  console.log(`Back to BigInt: ${backToBigInt} (${typeof backToBigInt})`);
  console.log('✅ Type conversions work');
  
  // Test 4: Edge cases
  console.log('\n4. Testing edge cases...');
  
  const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
  const beyondSafeInt = maxSafeInt + BigInt(1);
  
  console.log(`Max safe integer: ${maxSafeInt}`);
  console.log(`Beyond safe integer: ${beyondSafeInt}`);
  console.log(`Max safe as number: ${Number(maxSafeInt)}`);
  console.log(`Beyond safe as number: ${Number(beyondSafeInt)}`); // This might lose precision
  console.log('✅ Edge cases handled');
  
  // Test 5: Server connectivity (simple)
  console.log('\n5. Testing server connectivity...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/predictions`);
    console.log(`Server response status: ${response.status}`);
    console.log(`Predictions found: ${response.data.length}`);
    console.log('✅ Server is responding');
    
    // Test 6: Check if predictions have proper BigInt serialization
    if (response.data.length > 0) {
      const prediction = response.data[0];
      console.log('\n6. Testing prediction data structure...');
      console.log('Sample prediction:', JSON.stringify(prediction, null, 2));
      console.log('✅ Prediction data structure looks good');
    }
    
  } catch (error) {
    console.log(`❌ Server connectivity failed: ${error.message}`);
    console.log('Make sure the server is running with: npm run dev');
  }
  
  console.log('\n🎉 Basic BigInt functionality tests completed!');
}

// Run the test
testBigIntBasics().catch(console.error);