const createApp = require('./app');
const repository = require('./db');
const config = require('./config');

async function main() {
  await repository.init();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`Contacts API listening on port ${config.port} (driver: ${config.dbDriver}, env: ${config.env})`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
