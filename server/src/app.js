const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const contactsRouter = require('./routes/contacts');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', driver: config.dbDriver, env: config.env });
  });

  app.use('/api/contacts', contactsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
