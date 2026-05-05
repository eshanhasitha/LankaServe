export const getPagination = (query = {}) => {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

export const buildPaginationMeta = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
});
