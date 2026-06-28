const config = require('../config');

function loadRepository() {
  if (config.dbDriver === 'postgres') {
    return require('./postgres');
  }
  return require('./sqlite');
}

module.exports = loadRepository();
