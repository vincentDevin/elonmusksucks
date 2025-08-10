#!/usr/bin/env node

/**
 * Debug API endpoints to find which ones are failing
 */

const axios = require('axios');
const BASE_URL = 'http://127.0.0.1:5001';

async function debugEndpoints() {
  console.log('🔍 Debugging API endpoints...\n');
  
  const endpoints = [
    { method: 'GET', url: '/api/predictions', auth: false, description: 'Get all predictions' },
    { method: 'GET', url: '/api/market/overview', auth: false, description: 'Market overview' },
    { method: 'GET', url: '/api/leaderboard', auth: false, description: 'Leaderboard' },
    { method: 'GET', url: '/api/activity/recent', auth: false, description: 'Recent activity' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint.method} ${endpoint.url} - ${endpoint.description}`);
      
      const response = await axios({
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.url}`,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`✅ ${endpoint.url} - Status: ${response.status}`);
      
      // Check for BigInt serialization issues
      const responseStr = JSON.stringify(response.data);
      if (responseStr.includes('null') && responseStr.includes('"null"')) {
        console.log(`⚠️  ${endpoint.url} - Contains string "null" values`);
      }
      
      // Log first item structure if it's an array
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log(`📋 First item keys: ${Object.keys(response.data[0]).join(', ')}`);
      } else if (typeof response.data === 'object' && response.data) {
        console.log(`📋 Response keys: ${Object.keys(response.data).join(', ')}`);
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`❌ ${endpoint.url} - ERROR: ${error.response?.status || 'Network'} ${error.response?.statusText || error.message}`);
      
      if (error.response?.data) {
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
      console.log('');
    }
  }
  
  // Test a POST endpoint that might be causing issues
  console.log('\n🔍 Testing potential problematic requests...\n');
  
  // Test what happens when we send various payload types
  const testPayloads = [
    { name: 'Empty object', data: {} },
    { name: 'Null', data: null },
    { name: 'String "null"', data: 'null' },
    { name: 'Valid JSON', data: { test: 'value' } }
  ];
  
  for (const payload of testPayloads) {
    try {
      console.log(`Testing payload: ${payload.name}`);
      
      const response = await axios({
        method: 'POST',
        url: `${BASE_URL}/api/auth/login`,  // Use login as test endpoint
        data: payload.data,
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validateStatus: () => true  // Don't throw on 4xx/5xx
      });
      
      console.log(`✅ ${payload.name} - Status: ${response.status} ${response.statusText}`);
      
    } catch (error) {
      console.log(`❌ ${payload.name} - ERROR: ${error.message}`);
    }
  }
}

debugEndpoints().catch(console.error);