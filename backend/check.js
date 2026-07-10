require('dotenv').config();
const db = require('./src/db/connection.js');
(async () => {
  try {
    const res = await db.query("SELECT tc.table_name FROM information_schema.table_constraints AS tc JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'interviews'");
    console.log(res);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
