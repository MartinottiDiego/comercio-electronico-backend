const http = require('http');

const options = {
  host: 'localhost',
  port: 1337,
  path: '/_health',
  timeout: 5000
};

const healthCheck = http.request(options, (res) => {
  console.log(`Health check status: ${res.statusCode}`);
  if (res.statusCode === 200 || res.statusCode === 404) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

healthCheck.on('error', (err) => {
  console.error('Health check failed:', err.message);
  process.exit(1);
});

healthCheck.on('timeout', () => {
  console.error('Health check timed out');
  process.exit(1);
});

healthCheck.end();