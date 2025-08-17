// apps/client/src/utils/formatting.test.ts

import { formatMuskBucks } from './formatting';

// Simple test function to verify our formatting works
console.log('Testing MuskBucks formatting:');
console.log('500:', formatMuskBucks(500)); // Should be: 500
console.log('1,234:', formatMuskBucks(1234)); // Should be: 1,234
console.log('15,000:', formatMuskBucks(15000)); // Should be: 15k
console.log('200,000:', formatMuskBucks(200000)); // Should be: 200k
console.log('1,400,000:', formatMuskBucks(1400000)); // Should be: 1.4M
console.log('2,300,000,000:', formatMuskBucks(2300000000)); // Should be: 2.3B
console.log('15,500,000,000,000:', formatMuskBucks(15500000000000)); // Should be: 15.5T

// Test BigInt support
console.log('BigInt 1000000000000n:', formatMuskBucks(1000000000000n)); // Should be: 1T

// Test edge cases
console.log('0:', formatMuskBucks(0)); // Should be: 0
console.log('Negative -50000:', formatMuskBucks(-50000)); // Should be: -50k
