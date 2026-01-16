import http from 'node:http';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let parsed = null;
      try {
        parsed = JSON.parse(body || '{}');
        console.log('Received JSON payload:');
        console.log(JSON.stringify(parsed, null, 2));
      } catch (error) {
        console.log('Failed to parse JSON. Raw body:');
        console.log(body);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok' }));
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'error' }));
    });
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
  }
});

server.listen(8080, () => {
  console.log('Webhook test server listening on http://localhost:8080/webhook');
});
