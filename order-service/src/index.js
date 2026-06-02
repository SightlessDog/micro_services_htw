const express = require('express');
const ordersRouter = require('./routes/orders');
const { connectProducer } = require('./kafka');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.use('/orders', ordersRouter);

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

connectProducer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Order service running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
