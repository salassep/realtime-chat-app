const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();

app.use(cors());

const server = http.createServer(app);

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
