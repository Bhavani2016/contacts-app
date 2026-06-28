require('dotenv').config();

const required = (name, fallback) => {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v;
};

const config = {
  port: parseInt(required('PORT', '8080'), 10),
  env: required('NODE_ENV', 'development'),
  // DB_DRIVER: 'sqlite' (default, file-based, zero external deps) or 'postgres'
  dbDriver: required('DB_DRIVER', 'sqlite'),
  sqlitePath: required('SQLITE_PATH', './data/contacts.db'),
  // Standard libpq-style connection string, e.g.
  // postgres://user:password@host:5432/dbname?sslmode=require
  databaseUrl: required('DATABASE_URL', ''),
  corsOrigin: required('CORS_ORIGIN', '*'),
  defaultPageSize: 10,
  maxPageSize: 100,
};

module.exports = config;
