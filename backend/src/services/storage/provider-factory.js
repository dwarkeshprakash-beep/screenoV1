// backend/src/services/storage/provider-factory.js
// The one place that decides which concrete storage provider to use. Every
// other file depends on the { upload, getSignedUrl, remove, download }
// abstraction those providers share, never on Supabase/S3 directly.

/**
 * @param {NodeJS.ProcessEnv} env - injectable for tests; defaults to process.env
 * @returns {{ upload: Function, getSignedUrl: Function, remove: Function, download: Function }}
 */
function resolveProvider(env = process.env) {
  return env.STORAGE_PROVIDER === 's3'
    ? require('./s3.provider')
    : require('./supabase.provider')
}

module.exports = { resolveProvider }
