import { getPagination, buildPaginationMeta } from '../../src/utils/pagination.js';

describe('Pagination utility', () => {
    it('should return default pagination when query is empty', () => {
        const pag = getPagination();
        expect(pag).toEqual({ page: 1, limit: 10, skip: 0 });
    });

    it('should compute skip correctly for custom page and limit', () => {
        const pag = getPagination({ page: '3', limit: '20' });
        expect(pag).toEqual({ page: 3, limit: 20, skip: 40 });
    });

    it('should clamp limit and page bounds', () => {
        const pag = getPagination({ page: '-5', limit: '500' });
        expect(pag).toEqual({ page: 1, limit: 100, skip: 0 });
    });

    it('should build pagination metadata correctly', () => {
        const meta = buildPaginationMeta({ page: 2, limit: 10, total: 45 });
        expect(meta).toEqual({ page: 2, limit: 10, total: 45, totalPages: 5 });
    });
});
