/* Run schema creation/migration for whichever DB_DRIVER is configured. */
const repository = require('./index');
const config = require('../config');

(async () => {
  try {
    await repository.init();
    console.log(`Migration complete (driver: ${config.dbDriver}).`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();
