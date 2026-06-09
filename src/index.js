require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');

const PORT = 5000;
const HOST = '0.0.0.0';

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

app.use('/', routes);

app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ error: { message: 'Internal server error', type: 'server_error' } });
});

app.listen(PORT, HOST, () => {
  console.log(`pollinations-router running on http://${HOST}:${PORT}`);
  console.log(`Default provider: pollinations (no API key required)`);
  console.log(`Endpoints: GET / for API info`);
});
