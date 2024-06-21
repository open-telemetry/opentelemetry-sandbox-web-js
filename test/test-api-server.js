const http = require('http');

const port = 3000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');

  const response = {
    message: 'some message',
    success: true
  };

  res.end(JSON.stringify(response));
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
