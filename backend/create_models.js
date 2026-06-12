require('dotenv').config()
const fs = require('fs')
const path = require('path')
const db = require('./src/db/connection')
const { SCHEMA } = require('./src/db/schema')

const JS_TYPES = {
  integer: 'number',
  numeric: 'number',
  'character varying': 'string',
  text: 'string',
  'timestamp with time zone': 'Date',
}

function modelName(table) {
  return table
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function fileName(table) {
  return table.replaceAll('_', '-') + '.model.js'
}

async function main() {
  const rows = await db.query(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `)
  const metadata = new Map()
  for (const row of rows) {
    const columns = metadata.get(row.table_name) || new Map()
    columns.set(row.column_name, row)
    metadata.set(row.table_name, columns)
  }

  const modelsDir = path.join(__dirname, 'src', 'models')
  fs.mkdirSync(modelsDir, { recursive: true })
  const expectedFiles = new Set()

  for (const [table, definition] of Object.entries(SCHEMA)) {
    const lines = [`/**`, ` * @typedef {Object} ${modelName(table)}`]
    for (const column of definition.columns) {
      const meta = metadata.get(table)?.get(column)
      if (!meta) throw new Error(`Schema reference is missing live column ${table}.${column}`)
      const baseType = JS_TYPES[meta.data_type] || '*'
      const type = meta.is_nullable === 'YES' ? `${baseType}|null` : baseType
      lines.push(` * @property {${type}} ${column}`)
    }
    lines.push(' */', 'module.exports = {}', '')
    const output = fileName(table)
    expectedFiles.add(output)
    fs.writeFileSync(path.join(modelsDir, output), lines.join('\n'))
  }

  for (const file of fs.readdirSync(modelsDir)) {
    if (file.endsWith('.model.js') && !expectedFiles.has(file)) {
      fs.unlinkSync(path.join(modelsDir, file))
    }
  }

  console.log(`Generated ${expectedFiles.size} model reference files.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Model generation failed:', err.message)
  process.exit(1)
})
