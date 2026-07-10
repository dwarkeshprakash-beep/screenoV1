require('dotenv').config();
const db = require('./src/db/connection.js');
(async () => {
  try {
    await db.query("DELETE FROM email_outbox_jobs WHERE event_key LIKE 'monthly_occurrence_%'");
    await db.query("DELETE FROM monthly_assessment_occurrences");
    await db.query("DELETE FROM monthly_assessment_enrollments");
    const r1 = await db.query("SELECT count(*) as c FROM monthly_assessment_enrollments");
    console.log('enrollments after clear:', r1);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
