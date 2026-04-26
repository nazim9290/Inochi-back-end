#!/usr/bin/env node
require('dotenv').config();
const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL');

    const force = process.argv.includes('--force');
    const alter = process.argv.includes('--alter');

    if (force) console.log('!! sync({ force: true }) — all tables will be dropped and recreated');
    if (alter) console.log('Running sync({ alter: true })');

    await sequelize.sync({ force, alter });
    console.log('Schema synced.');
    process.exit(0);
  } catch (err) {
    console.error('DB sync failed:', err.message);
    process.exit(1);
  }
})();
