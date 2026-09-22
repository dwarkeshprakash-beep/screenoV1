// backend/src/utils/pagination.js
// Shared pagination defaults + normalization for admin list endpoints (Roles, Users, ...).

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

function resolvePagination({ page, pageSize } = {}) {
  const safePageSize = Math.min(Math.max(Number(pageSize) || DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE)
  const safePage = Math.max(Number(page) || 1, 1)
  const offset = (safePage - 1) * safePageSize
  return { page: safePage, pageSize: safePageSize, offset }
}

function buildPaginationMeta({ page, pageSize, total }) {
  return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) }
}

// Every paginated repository query selects COUNT(*) OVER() AS total_count on each
// row so the total survives the LIMIT/OFFSET - this strips it back off and reads
// the total once, instead of each repository re-implementing the same two lines.
function extractPage(rows) {
  const total = rows[0] ? Number(rows[0].total_count) : 0
  return { rows: rows.map(({ total_count, ...rest }) => rest), total }
}

module.exports = { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, resolvePagination, buildPaginationMeta, extractPage }
