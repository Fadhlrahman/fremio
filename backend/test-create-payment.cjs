// Test payment creation directly
const https = require('https');
const process = require('process');

// Disable SSL verification for localhost
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Mock JWT token for user kuatbotak808@gmail.com
const userId = '5ce1388b-5b8c-4d92-a3a6-8df381977721';
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: userId, email: 'kuatbotak808@gmail.com', role: 'user' },
  'fremio-dev-secret-key-2024-local-testing',
  { expiresIn: '1h' }
);

const data = JSON.stringify({
  email: 'kuatbotak808@gmail.com',
  name: 'botak kuat',
  phone: '08123456789'
});

const options = {
  hostname: 'localhost',
  port: 5050,
  path: '/api/payment/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${token}`
  },
  rejectUnauthorized: false
};

console.log('🔄 Testing payment creation...\n');
console.log('User ID:', userId);
console.log('Token:', token.substring(0, 50) + '...\n');

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}\n`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ Payment created successfully!');
        console.log('Order ID:', response.data.orderId);
        console.log('Token:', response.data.token);
      } else {
        console.log('\n❌ Payment creation failed!');
        console.log('Message:', response.message);
      }
    } catch (error) {
      console.log('Response body:', responseData);
      console.log('Parse error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.write(data);
req.end();
