import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { initPayment, providerPaid, customerConfirm, adminVerify, getProviderPayments } from '../services/payment.service.js';
import { writeAuditLog } from '../services/audit.service.js';

export const init = async (req, res, next) => {
    try {
        const payment = await initPayment(req.params.jobId);
        return sendResponse(res, { statusCode: 201, message: 'Payment initialized', data: payment });
    } catch (error) { next(error); }
};

export const markProviderPaid = async (req, res, next) => {
    try {
        const payment = await providerPaid(req.params.jobId, req.user._id);
        return sendResponse(res, { message: 'Provider marked paid', data: payment });
    } catch (error) { next(error); }
};

export const confirmByCustomer = async (req, res, next) => {
    try {
        const payment = await customerConfirm(req.params.jobId, req.user._id);
        return sendResponse(res, { message: 'Customer confirmed payment', data: payment });
    } catch (error) { next(error); }
};

export const verifyByAdmin = async (req, res, next) => {
    try {
        const payment = await adminVerify(req.params.jobId);
        await writeAuditLog({
            actorId: req.admin._id,
            action: 'payment_verify',
            entity: 'Payment',
            entityId: String(payment._id),
            metadata: { actorType: 'admin', adminRole: req.admin.role },
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
        return sendResponse(res, { message: 'Admin verified payment', data: payment });
    } catch (error) { next(error); }
};

export const myPayments = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { items, total } = await getProviderPayments(req.user._id, { page, limit, skip });
        return sendResponse(res, { message: 'My payments', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};
