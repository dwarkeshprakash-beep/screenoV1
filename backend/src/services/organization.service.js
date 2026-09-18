// backend/src/services/organization.service.js
// Business logic for the Organizations module - the admin-facing name for the
// companies table (a "company" here is the tenant boundary every other RBAC
// module - Roles, Users, ACLs - is scoped under). Validation only, no SQL here.

const companyRepository = require('../repositories/company.repository')
const { resolvePagination, buildPaginationMeta } = require('../utils/pagination')
const { toSearchPattern } = require('../utils/sql-search')

const NAME_MAX_LENGTH = 255
const LOGO_URL_MAX_LENGTH = 500

function validateOrganizationInput({ name, logoUrl }) {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) throw new Error('Organization name is required')
  if (trimmedName.length > NAME_MAX_LENGTH) throw new Error('Organization name is too long')

  const trimmedLogoUrl = typeof logoUrl === 'string' ? logoUrl.trim() : ''
  if (trimmedLogoUrl.length > LOGO_URL_MAX_LENGTH) throw new Error('Logo URL is too long')

  return { name: trimmedName, logoUrl: trimmedLogoUrl || null }
}

async function listOrganizations({ page, pageSize, search } = {}) {
  if (!page) return { data: await companyRepository.getAll(), pagination: null }

  const resolved = resolvePagination({ page, pageSize })
  const searchPattern = toSearchPattern(search)
  const { rows, total } = await companyRepository.getByPage({ limit: resolved.pageSize, offset: resolved.offset, searchPattern })
  return { data: rows, pagination: buildPaginationMeta({ ...resolved, total }) }
}

async function getOrganization(id) {
  const organization = await companyRepository.getById(id)
  if (!organization) throw new Error('Organization not found')
  return organization
}

async function createOrganization(input) {
  const { name, logoUrl } = validateOrganizationInput(input)

  const existing = await companyRepository.getByName(name)
  if (existing) throw new Error('An organization with this name already exists')

  return companyRepository.create({ name, logoUrl })
}

async function updateOrganization(id, input) {
  const { name, logoUrl } = validateOrganizationInput(input)

  const existing = await companyRepository.getByName(name)
  if (existing && existing.id !== id) throw new Error('An organization with this name already exists')

  const updated = await companyRepository.update(id, { name, logoUrl })
  if (!updated) throw new Error('Organization not found')
  return updated
}

async function deleteOrganization(id) {
  const hasUsers = await companyRepository.hasUsers(id)
  if (hasUsers) throw new Error('Cannot delete this organization - it still has users assigned to it')

  const deleted = await companyRepository.remove(id)
  if (!deleted) throw new Error('Organization not found')
}

module.exports = { listOrganizations, getOrganization, createOrganization, updateOrganization, deleteOrganization }
