import { sqlite } from '../../database/connection.js'

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  search?: string
  searchFields?: string[]
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Paginate query results
 */
export function paginate<T>(
  table: string,
  params: PaginationParams = {},
  whereClause: string = '',
  whereParams: any[] = []
): PaginatedResult<T> {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 20))
  const offset = (page - 1) * limit
  const sortBy = params.sortBy || 'id'
  const sortOrder = params.sortOrder || 'DESC'

  // Build search clause
  let searchClause = ''
  const searchParams: any[] = []
  if (params.search && params.searchFields?.length) {
    const conditions = params.searchFields.map(field => `${field} LIKE ?`)
    searchClause = `(${conditions.join(' OR ')})`
    searchParams.push(...params.searchFields.map(() => `%${params.search}%`))
  }

  // Combine where and search
  const conditions = [whereClause, searchClause].filter(Boolean)
  const finalWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const finalParams = [...whereParams, ...searchParams]

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM ${table} ${finalWhere}`
  const { total } = sqlite.prepare(countQuery).get(...finalParams) as { total: number }

  // Get paginated data
  const dataQuery = `
    SELECT * FROM ${table} 
    ${finalWhere}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT ? OFFSET ?
  `
  const data = sqlite.prepare(dataQuery).all(...finalParams, limit, offset) as T[]

  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}
