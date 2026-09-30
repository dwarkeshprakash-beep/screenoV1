// backend/src/services/storage/supabase.provider.js
// Thin I/O adapter over Supabase Storage. No path/business logic here -
// see storage.service.js for that. Selected when STORAGE_PROVIDER=supabase (the default).

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'files'

/**
 * @param {string} path - storage key
 * @param {Buffer} buffer
 * @param {{ contentType: string, upsert?: boolean }} options
 */
async function upload(path, buffer, { contentType, upsert = false }) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType, upsert })
  if (error) throw error
}

/**
 * @param {string} path
 * @param {number} expiresIn - seconds
 * @returns {Promise<string>}
 */
async function getSignedUrl(path, expiresIn) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error) throw error
  return data.signedUrl
}

/** @param {string[]} paths */
async function remove(paths) {
  const { error } = await supabase.storage.from(BUCKET).remove(paths)
  if (error) throw error
}

/**
 * @param {string} path
 * @returns {Promise<Buffer>}
 */
async function download(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

module.exports = { upload, getSignedUrl, remove, download }
