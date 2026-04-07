/**
 * Pagination utility for backend API endpoints.
 * Provides standardized pagination helpers and response formatting.
 */

/**
 * Parses pagination query parameters from the request.
 * Defaults: page=1, limit=20, maxLimit=100
 */
const parsePagination = (query, options = {}) => {
  const { maxLimit = 100 } = options;

  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  // Validate and clamp values
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Builds a standardized paginated response object.
 */
const buildPaginatedResponse = (data, totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    },
  };
};

/**
 * Generates SQL LIMIT and OFFSET clause string.
 */
const getPaginationClause = (page, limit) => {
  const offset = (page - 1) * limit;
  return { limit, offset };
};

/**
 * Wraps an endpoint handler to add pagination support.
 * Usage:
 *   router.get('/items', withPagination(async (req, res, { page, limit, offset }) => {
 *     const { data, total } = await fetchWithPagination(offset, limit);
 *     return sendPaginated(res, data, total, page, limit);
 *   }));
 */
const withPagination = (handler, options = {}) => {
  return async (req, res) => {
    const { maxLimit = 100 } = options;
    const pagination = parsePagination(req.query, { maxLimit });
    return handler(req, res, pagination);
  };
};

/**
 * Sends a paginated response in the standard format.
 */
const sendPaginated = (res, status, data, totalCount, page, limit, message = undefined) => {
  const body = buildPaginatedResponse(data, totalCount, page, limit);

  return res.status(status).json({
    success: true,
    ...(message ? { message } : {}),
    ...body,
  });
};

module.exports = {
  parsePagination,
  buildPaginatedResponse,
  getPaginationClause,
  withPagination,
  sendPaginated,
};
