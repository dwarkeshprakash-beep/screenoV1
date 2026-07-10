const db = require('./src/db/connection');
async function run() {
  try { await db.query('ALTER TABLE client_mandate_requirements DROP COLUMN resume_deadline;'); } catch (e) { console.log(e.message); }
  try { await db.query('ALTER TABLE client_templates DROP COLUMN resume_deadline;'); } catch (e) { console.log(e.message); }
  console.log('Done');
  process.exit(0);
}
run();
