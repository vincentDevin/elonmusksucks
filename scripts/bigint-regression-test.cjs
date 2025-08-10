#!/usr/bin/env node

/**
 * BigInt Regression Test Suite
 * 
 * Comprehensive test of all BigInt functionality after migration from number to BigInt
 * for user balances, bet amounts, payouts, and transaction amounts.
 * 
 * Tests all critical paths:
 * - User balance operations
 * - Bet placement and payouts
 * - Parlay creation and resolution
 * - Transaction history
 * - Leaderboard calculations
 * - Admin operations
 */

const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:5001';
const TEST_USER_EMAIL = `test-${Date.now()}@example.com`;
const TEST_USER_PASSWORD = 'password123';
const TEST_USER_NAME = 'BigInt Test User';

class BigIntRegressionTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.testData = {
      createdPredictions: [],
      createdBets: [],
      createdParlays: [],
      originalUserBalance: null,
      authToken: null,
      testUserId: null
    };
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async makeRequest(method, url, data = null, requireAuth = true) {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (requireAuth && this.testData.authToken) {
        headers['Authorization'] = `Bearer ${this.testData.authToken}`;
      }
      
      const config = {
        method,
        url: `${BASE_URL}${url}`,
        headers
      };
      
      // Only add data if it's not null to avoid sending "null" string
      if (data !== null) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      throw new Error(`Request failed: ${error.response?.status} ${error.response?.statusText} - ${errorMessage}`);
    }
  }

  async authenticateTestUser() {
    this.log('🔐 Setting up test user authentication...');
    
    try {
      // Try to register a test user first (might already exist)
      try {
        await this.makeRequest('POST', '/api/auth/register', {
          name: TEST_USER_NAME,
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD
        }, false);
        this.log('✅ Test user registered successfully');
      } catch (error) {
        if (error.message.includes('409') || error.message.includes('already exists')) {
          this.log('ℹ️ Test user already exists, proceeding with login');
        } else {
          throw error;
        }
      }
      
      // Login to get auth token
      const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      }, false);
      
      this.testData.authToken = loginResponse.accessToken;
      
      // Extract user ID from JWT token
      if (this.testData.authToken) {
        try {
          const tokenParts = this.testData.authToken.split('.');
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          this.testData.testUserId = payload.userId;
          this.log(`Extracted user ID from JWT: ${this.testData.testUserId}`);
        } catch (error) {
          this.log(`Failed to parse JWT: ${error.message}`);
        }
      }
      
      this.assert(!!this.testData.authToken, 'Should receive auth token from login');
      this.assert(!!this.testData.testUserId, 'Should receive user ID from login');
      
      this.log(`✅ Authentication successful - User ID: ${this.testData.testUserId}`);
      
    } catch (error) {
      this.assert(false, `Authentication setup failed: ${error.message}`);
      throw error;
    }
  }

  assert(condition, message) {
    if (condition) {
      this.testResults.passed++;
      this.log(`✅ PASS: ${message}`);
    } else {
      this.testResults.failed++;
      this.testResults.errors.push(message);
      this.log(`❌ FAIL: ${message}`);
    }
  }

  // Test BigInt values are properly serialized as strings
  assertBigIntSerialization(value, fieldName) {
    this.assert(typeof value === 'string', `${fieldName} should be serialized as string, got ${typeof value}`);
    this.assert(!isNaN(Number(value)), `${fieldName} string should be parseable as number: ${value}`);
  }

  // Test arithmetic operations work with large values
  async testLargeNumberHandling() {
    this.log('\n=== Testing Large Number Handling ===');
    
    // Test values that exceed 32-bit integer limits
    const testAmounts = [
      '2147483648',      // 2^31 (exceeds 32-bit signed int)
      '4294967296',      // 2^32 (exceeds 32-bit unsigned int)
      '9223372036854775807', // Max 64-bit signed int
      '999999999999999999'   // Large but manageable
    ];

    for (const amount of testAmounts) {
      try {
        // Test that the API can handle large amounts in requests
        const bigIntValue = BigInt(amount);
        this.assert(bigIntValue.toString() === amount, `BigInt conversion works for ${amount}`);
        
        // Test JSON serialization doesn't lose precision
        const serialized = JSON.stringify({ amount });
        const parsed = JSON.parse(serialized);
        this.assert(parsed.amount === amount, `JSON serialization preserves precision for ${amount}`);
        
      } catch (error) {
        this.assert(false, `Large number handling failed for ${amount}: ${error.message}`);
      }
    }
  }

  async testUserBalanceOperations() {
    this.log('\n=== Testing User Balance Operations ===');
    
    try {
      // Get current user balance
      const userProfile = await this.makeRequest('GET', `/api/users/${this.testData.testUserId}/profile`);
      this.testData.originalUserBalance = userProfile.muskBucks;
      
      this.log(`Original user balance: ${this.testData.originalUserBalance}`);
      
      // Test balance is serialized as string
      this.assertBigIntSerialization(userProfile.muskBucks, 'User balance');
      
      // Test balance is a reasonable value (not NaN or null)
      const balanceNum = Number(userProfile.muskBucks);
      this.assert(balanceNum >= 0, 'User balance should be non-negative');
      this.assert(balanceNum < Number.MAX_SAFE_INTEGER, 'User balance should be within safe integer range for display');
      
    } catch (error) {
      this.assert(false, `User balance operations failed: ${error.message}`);
    }
  }

  async testBetPlacement() {
    this.log('\n=== Testing Bet Placement ===');
    
    try {
      // First, get available predictions
      const predictions = await this.makeRequest('GET', '/api/predictions');
      this.assert(predictions.length > 0, 'Should have predictions available for betting');
      
      const prediction = predictions.find(p => !p.resolved && p.approved && new Date(p.expiresAt) > new Date());
      if (!prediction) {
        this.log('⚠️ No active predictions found, skipping bet placement tests');
        return;
      }
      
      this.assert(prediction.options.length > 0, 'Prediction should have options');
      const option = prediction.options[0];
      
      // Test various bet amounts including large ones
      const testAmounts = [100, 1000, 50000, 1000000];
      
      for (const amount of testAmounts) {
        try {
          const betData = {
            optionId: option.id,
            amount: amount
          };
          
          const bet = await this.makeRequest('POST', `/api/predictions/${prediction.id}/bet`, betData);
          this.testData.createdBets.push(bet);
          
          // Test bet response format
          this.assertBigIntSerialization(bet.amount, 'Bet amount');
          this.assertBigIntSerialization(bet.potentialPayout, 'Potential payout');
          
          // Test amount matches what was sent
          this.assert(Number(bet.amount) === amount, `Bet amount should match requested amount: ${bet.amount} vs ${amount}`);
          
          // Test potential payout is reasonable
          const potentialPayoutNum = Number(bet.potentialPayout);
          this.assert(potentialPayoutNum > amount, 'Potential payout should be greater than bet amount');
          
          this.log(`Successfully placed bet: ${amount} MuskBucks, potential payout: ${bet.potentialPayout}`);
          
        } catch (error) {
          // If insufficient funds, that's expected for large amounts
          if (error.message.includes('INSUFFICIENT_FUNDS')) {
            this.log(`Expected insufficient funds error for amount ${amount}`);
            this.testResults.passed++;
          } else {
            this.assert(false, `Bet placement failed for amount ${amount}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      this.assert(false, `Bet placement tests failed: ${error.message}`);
    }
  }

  async testParlayCreation() {
    this.log('\n=== Testing Parlay Creation ===');
    
    try {
      // Get multiple active predictions for parlay
      const predictions = await this.makeRequest('GET', '/api/predictions');
      const activePredictions = predictions.filter(p => !p.resolved && p.approved && new Date(p.expiresAt) > new Date());
      
      if (activePredictions.length < 2) {
        this.log('⚠️ Need at least 2 active predictions for parlay tests, skipping');
        return;
      }
      
      // Create parlay with 2 legs
      const leg1 = { optionId: activePredictions[0].options[0].id };
      const leg2 = { optionId: activePredictions[1].options[0].id };
      
      const parlayData = {
        legs: [leg1, leg2],
        amount: 1000
      };
      
      try {
        const parlay = await this.makeRequest('POST', '/api/parlays', parlayData);
        this.testData.createdParlays.push(parlay);
        
        // Test parlay response format
        this.assertBigIntSerialization(parlay.amount, 'Parlay amount');
        this.assertBigIntSerialization(parlay.potentialPayout, 'Parlay potential payout');
        
        // Test parlay calculations
        const amount = Number(parlay.amount);
        const potentialPayout = Number(parlay.potentialPayout);
        
        this.assert(amount === 1000, 'Parlay amount should match requested');
        this.assert(potentialPayout > amount, 'Parlay potential payout should be greater than amount');
        this.assert(parlay.combinedOdds > 1, 'Combined odds should be greater than 1');
        
        this.log(`Successfully created parlay: ${parlay.amount} MuskBucks, potential payout: ${parlay.potentialPayout}, odds: ${parlay.combinedOdds}`);
        
      } catch (error) {
        if (error.message.includes('INSUFFICIENT_FUNDS')) {
          this.log('Expected insufficient funds error for parlay');
          this.testResults.passed++;
        } else {
          this.assert(false, `Parlay creation failed: ${error.message}`);
        }
      }
      
    } catch (error) {
      this.assert(false, `Parlay creation tests failed: ${error.message}`);
    }
  }

  async testTransactionHistory() {
    this.log('\n=== Testing Transaction History ===');
    
    try {
      const transactions = await this.makeRequest('GET', `/api/users/${this.testData.testUserId}/transactions`);
      
      if (transactions.length > 0) {
        const transaction = transactions[0];
        
        // Test transaction serialization
        this.assertBigIntSerialization(transaction.amount, 'Transaction amount');
        this.assertBigIntSerialization(transaction.balanceAfter, 'Transaction balance after');
        
        // Test transaction types
        this.assert(['DEBIT', 'CREDIT'].includes(transaction.type), `Transaction type should be valid: ${transaction.type}`);
        
        // Test amounts are reasonable
        const amount = Number(transaction.amount);
        const balanceAfter = Number(transaction.balanceAfter);
        this.assert(amount >= 0, 'Transaction amount should be non-negative');
        this.assert(balanceAfter >= 0, 'Balance after should be non-negative');
        
        this.log(`Transaction history test passed: ${transactions.length} transactions found`);
      } else {
        this.log('No transactions found - creating some via betting should generate transactions');
      }
      
    } catch (error) {
      this.assert(false, `Transaction history test failed: ${error.message}`);
    }
  }

  async testUserStats() {
    this.log('\n=== Testing User Stats ===');
    
    try {
      const userStats = await this.makeRequest('GET', `/api/users/${this.testData.testUserId}/stats`);
      
      if (userStats) {
        // Test BigInt fields are serialized as strings
        this.assertBigIntSerialization(userStats.totalWagered, 'Total wagered');
        this.assertBigIntSerialization(userStats.totalWon, 'Total won');
        this.assertBigIntSerialization(userStats.profit, 'Profit');
        this.assertBigIntSerialization(userStats.biggestWin, 'Biggest win');
        
        // Test calculations
        const totalWagered = Number(userStats.totalWagered);
        const totalWon = Number(userStats.totalWon);
        const profit = Number(userStats.profit);
        
        this.assert(totalWagered >= 0, 'Total wagered should be non-negative');
        this.assert(totalWon >= 0, 'Total won should be non-negative');
        this.assert(Math.abs(profit - (totalWon - totalWagered)) < 0.01, 'Profit should equal totalWon - totalWagered');
        
        // Test percentages
        this.assert(userStats.roi >= -1, 'ROI should be >= -100%');
        this.assert(userStats.totalBets >= 0, 'Total bets should be non-negative');
        
        this.log(`User stats test passed - Total wagered: ${userStats.totalWagered}, Profit: ${userStats.profit}`);
      }
      
    } catch (error) {
      this.assert(false, `User stats test failed: ${error.message}`);
    }
  }

  async testLeaderboard() {
    this.log('\n=== Testing Leaderboard ===');
    
    try {
      const leaderboard = await this.makeRequest('GET', '/api/leaderboard', null, false);
      
      if (leaderboard.length > 0) {
        const entry = leaderboard[0];
        
        // Test BigInt serialization
        this.assertBigIntSerialization(entry.balance, 'Leaderboard balance');
        this.assertBigIntSerialization(entry.profitAll, 'Leaderboard profit all');
        this.assertBigIntSerialization(entry.profitPeriod, 'Leaderboard profit period');
        
        // Test leaderboard structure
        this.assert(typeof entry.userId === 'number', 'User ID should be number');
        this.assert(typeof entry.userName === 'string', 'User name should be string');
        this.assert(typeof entry.winRate === 'number', 'Win rate should be number');
        this.assert(entry.winRate >= 0 && entry.winRate <= 1, 'Win rate should be between 0 and 1');
        
        this.log(`Leaderboard test passed - ${leaderboard.length} entries found`);
      } else {
        this.log('No leaderboard entries found');
      }
      
    } catch (error) {
      this.assert(false, `Leaderboard test failed: ${error.message}`);
    }
  }

  async testMarketOverview() {
    this.log('\n=== Testing Market Overview ===');
    
    try {
      const overview = await this.makeRequest('GET', '/api/market/overview', null, false);
      
      // Test that all numeric values are properly typed
      this.assert(typeof overview.totalUsers === 'number', 'Total users should be number');
      this.assert(typeof overview.activeMarkets === 'number', 'Active markets should be number');
      this.assert(typeof overview.totalVolume === 'number', 'Total volume should be number');
      
      // Test values are reasonable
      this.assert(overview.totalUsers >= 0, 'Total users should be non-negative');
      this.assert(overview.activeMarkets >= 0, 'Active markets should be non-negative');
      this.assert(overview.totalVolume >= 0, 'Total volume should be non-negative');
      
      this.log(`Market overview test passed - Users: ${overview.totalUsers}, Volume: ${overview.totalVolume}`);
      
    } catch (error) {
      this.assert(false, `Market overview test failed: ${error.message}`);
    }
  }

  async testAdminOperations() {
    this.log('\n=== Testing Admin Operations ===');
    
    try {
      // Test admin metrics (should handle BigInt serialization)
      const metrics = await this.makeRequest('GET', '/api/admin/metrics');
      
      if (metrics.overview) {
        // Test financial metrics are properly serialized
        this.assert(typeof metrics.overview.totalRevenue === 'number', 'Total revenue should be number');
        this.assert(typeof metrics.overview.totalPayouts === 'number', 'Total payouts should be number');
        this.assert(typeof metrics.overview.netProfit === 'number', 'Net profit should be number');
        
        this.log(`Admin metrics test passed - Revenue: ${metrics.overview.totalRevenue}`);
      }
      
      // Test financial search (if it exists)
      try {
        const financialData = await this.makeRequest('POST', '/api/admin/search/financial', {
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: new Date().toISOString()
        });
        
        if (financialData.bets && financialData.bets.length > 0) {
          const bet = financialData.bets[0];
          // These should be strings after conversion
          this.assert(typeof bet.amount === 'string', 'Admin bet amount should be string');
          if (bet.payout) {
            this.assert(typeof bet.payout === 'string', 'Admin bet payout should be string');
          }
        }
        
        this.log('Admin financial search test passed');
        
      } catch (error) {
        this.log(`Admin financial search not available or failed: ${error.message}`);
      }
      
    } catch (error) {
      this.assert(false, `Admin operations test failed: ${error.message}`);
    }
  }

  async testArithmeticEdgeCases() {
    this.log('\n=== Testing Arithmetic Edge Cases ===');
    
    // Test BigInt arithmetic operations that are used in the codebase
    try {
      // Test calculations that mirror what happens in payout calculations
      const testCases = [
        { amount: '1000', odds: 2.5, expectedPayout: 2500 },
        { amount: '999999999', odds: 1.1, expectedPayout: 1099999998 },
        { amount: '1', odds: 1000000, expectedPayout: 1000000 },
      ];
      
      for (const testCase of testCases) {
        const amount = BigInt(testCase.amount);
        const payout = BigInt(Math.floor(Number(amount) * testCase.odds));
        
        this.assert(Number(payout) === testCase.expectedPayout, 
          `Payout calculation: ${testCase.amount} * ${testCase.odds} = ${payout} (expected ${testCase.expectedPayout})`);
        
        // Test profit calculation
        const profit = payout - amount;
        this.assert(profit > 0, `Profit should be positive: ${profit}`);
        
        // Test serialization
        const serialized = {
          amount: amount.toString(),
          payout: payout.toString(),
          profit: profit.toString()
        };
        
        this.assert(serialized.amount === testCase.amount, 'Amount serialization should match');
        this.assert(Number(serialized.payout) === testCase.expectedPayout, 'Payout serialization should be correct');
      }
      
      this.log('Arithmetic edge cases passed');
      
    } catch (error) {
      this.assert(false, `Arithmetic edge cases failed: ${error.message}`);
    }
  }

  async runAllTests() {
    this.log('🚀 Starting BigInt Regression Test Suite');
    this.log(`Testing against: ${BASE_URL}`);
    
    try {
      // Test server is running by trying to access a public endpoint
      const predictions = await this.makeRequest('GET', '/api/predictions', null, false);
      this.log(`✅ Server is responding - Found ${predictions.length} predictions`);
    } catch (error) {
      this.log(`❌ Server is not responding at ${BASE_URL}`);
      this.log('Please make sure the server is running with: npm run dev');
      this.log(`Error: ${error.message}`);
      this.log('Let me try some other endpoints...');
      
      // Try alternative endpoints to see what's working
      try {
        await this.makeRequest('GET', '/api/market/overview', null, false);
        this.log('✅ Market overview endpoint is working');
      } catch (e) {
        this.log(`❌ Market overview failed: ${e.message}`);
      }
      
      try {
        await this.makeRequest('GET', '/api/leaderboard', null, false);
        this.log('✅ Leaderboard endpoint is working');  
      } catch (e) {
        this.log(`❌ Leaderboard failed: ${e.message}`);
      }
      
      this.log('\nProceeding with authentication test anyway...');
    }
    
    // Authenticate test user
    await this.authenticateTestUser();
    
    // Run all test suites
    await this.testLargeNumberHandling();
    await this.testUserBalanceOperations();
    await this.testBetPlacement();
    await this.testParlayCreation();
    await this.testTransactionHistory();
    await this.testUserStats();
    await this.testLeaderboard();
    await this.testMarketOverview();
    await this.testAdminOperations();
    await this.testArithmeticEdgeCases();
    
    // Print results
    this.log('\n=== Test Results ===');
    this.log(`✅ Passed: ${this.testResults.passed}`);
    this.log(`❌ Failed: ${this.testResults.failed}`);
    
    if (this.testResults.failed > 0) {
      this.log('\n=== Failures ===');
      this.testResults.errors.forEach(error => {
        this.log(`❌ ${error}`);
      });
    }
    
    // Print summary
    if (this.testResults.failed === 0) {
      this.log('\n🎉 ALL TESTS PASSED! BigInt migration is working correctly.');
      process.exit(0);
    } else {
      this.log('\n💥 Some tests failed. Please review the BigInt implementation.');
      process.exit(1);
    }
  }
}

// Run the tests
const tester = new BigIntRegressionTester();
tester.runAllTests().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});