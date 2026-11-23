require('./config/env');
const config = require('./config/env');

const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const Scheme = require('./models/Scheme');
const { applySecurity, generalLimiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
applySecurity(app);
app.use('/api', generalLimiter);

app.get('/api/health', (req, res) =>
  res.json({
    status: 'ok',
    service: 'schemesetu-backend',
    db: mongoose.connection.readyState === 1,
  })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/laborer', require('./routes/laborer'));
app.use('/api/contractor', require('./routes/contractor'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/payments', require('./routes/payments'));
app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
    await User.syncIndexes();
    await Scheme.syncIndexes();
    console.log('MongoDB connected');
    app.listen(config.PORT, () => console.log(`SchemeSetu backend listening on port ${config.PORT}`));
  } catch (e) {
    console.error('Startup failed:', e.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (r) => {
  console.error('Unhandled rejection:', r);
  process.exit(1);
});

process.on('uncaughtException', (e) => {
  console.error('Uncaught exception:', e);
  process.exit(1);
});

start();
