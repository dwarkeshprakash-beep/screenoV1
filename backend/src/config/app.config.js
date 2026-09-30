// backend/src/config/app.config.js
// Single source for the app's display name - set APP_NAME in .env to rebrand
// everywhere (emails, PDF reports) without touching code.

const APP_NAME = process.env.APP_NAME || 'Screeno'

module.exports = {
  APP_NAME,
}
