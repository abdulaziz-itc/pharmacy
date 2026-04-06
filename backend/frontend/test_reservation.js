const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/v1/sales/reservations/15',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer ' + process.argv[2]
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(`Status: ${res.statusCode}\nBody: ${data}`));
});
req.on('error', console.error);
req.end();
