import SupportRequest from '../models/SupportRequest.model.js';
import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { resolveSupportAdminForUser } from '../services/message.service.js';

const statusLabels = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
};

async function generateTicketNumber() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const suffix = Math.floor(100000 + Math.random() * 900000);
        const ticketNumber = `TK-${suffix}`;
        const exists = await SupportRequest.exists({ ticketNumber });
        if (!exists) return ticketNumber;
    }

    return `TK-${Date.now()}`;
}

function serializeTicket(ticket) {
    return {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        role: ticket.role,
        userId: ticket.userId?._id || ticket.userId || null,
        userName: ticket.userId?.name || '',
        userEmail: ticket.userId?.email || '',
        userDistrict: ticket.userId?.district || '',
        userCity: ticket.userId?.city || '',
        assignedAdminId: ticket.assignedAdminId?._id || ticket.assignedAdminId || null,
        assignedAdminName: ticket.assignedAdminId?.name || '',
        assignedAdminRole: ticket.assignedAdminId?.role || '',
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        statusLabel: statusLabels[ticket.status] || ticket.status,
        priority: ticket.priority,
        adminNotes: ticket.adminNotes || '',
        attachments: ticket.attachments || [],
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        closedAt: ticket.closedAt,
    };
}

export const createSupportRequest = async (req, res, next) => {
    try {
        const assignedAdmin = await resolveSupportAdminForUser(req.user._id);
        const ticket = await SupportRequest.create({
            ticketNumber: await generateTicketNumber(),
            userId: req.user._id,
            assignedAdminId: assignedAdmin?._id || null,
            role: req.user.role,
            category: req.body.category,
            subject: req.body.subject || req.body.category,
            message: req.body.message,
            attachments: req.body.attachments || [],
        });
        await ticket.populate('assignedAdminId', 'name role');

        return sendResponse(res, {
            statusCode: 201,
            message: 'Support request submitted',
            data: serializeTicket(ticket),
        });
    } catch (error) {
        next(error);
    }
};

export const listMySupportRequests = async (req, res, next) => {
    try {
        const requestedLimit = Number(req.safeQuery?.limit || req.query?.limit || 10);
        const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 10;
        const tickets = await SupportRequest.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('assignedAdminId', 'name role');

        return sendResponse(res, {
            message: 'My support requests',
            data: tickets.map(serializeTicket),
        });
    } catch (error) {
        next(error);
    }
};

export const getMySupportRequest = async (req, res, next) => {
    try {
        const ticket = await SupportRequest.findOne({ _id: req.params.id, userId: req.user._id })
            .populate('assignedAdminId', 'name role');
        if (!ticket) {
            return sendResponse(res, {
                statusCode: 404,
                success: false,
                message: 'Support request not found',
                errorCode: 'SUPPORT_REQUEST_NOT_FOUND',
            });
        }

        return sendResponse(res, {
            message: 'Support request',
            data: serializeTicket(ticket),
        });
    } catch (error) {
        next(error);
    }
};

export const listSupportRequestsForAdmin = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = {};

        if (req.query?.status) {
            filter.status = req.query.status;
        }
        if (req.query?.priority) {
            filter.priority = req.query.priority;
        }
        if (req.query?.role) {
            filter.role = req.query.role;
        }
        if (req.query?.category) {
            filter.category = req.query.category;
        }
        if (req.query?.assigned === 'me' && req.admin?._id) {
            filter.assignedAdminId = req.admin._id;
        }
        if (req.query?.assignedAdminId) {
            filter.assignedAdminId = req.query.assignedAdminId;
        }
        if (req.query?.search) {
            const pattern = String(req.query.search).trim();
            if (pattern) {
                filter.$or = [
                    { ticketNumber: { $regex: pattern, $options: 'i' } },
                    { subject: { $regex: pattern, $options: 'i' } },
                    { message: { $regex: pattern, $options: 'i' } },
                ];
            }
        }

        const [items, total] = await Promise.all([
            SupportRequest.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name email role district city')
                .populate('assignedAdminId', 'name role'),
            SupportRequest.countDocuments(filter),
        ]);

        return sendResponse(res, {
            message: 'Support requests',
            data: items.map(serializeTicket),
            pagination: buildPaginationMeta({ page, limit, total }),
        });
    } catch (error) {
        next(error);
    }
};

export const getSupportRequestForAdmin = async (req, res, next) => {
    try {
        const ticket = await SupportRequest.findById(req.params.id)
            .populate('userId', 'name email role district city')
            .populate('assignedAdminId', 'name role');
        if (!ticket) {
            return sendResponse(res, {
                statusCode: 404,
                success: false,
                message: 'Support request not found',
                errorCode: 'SUPPORT_REQUEST_NOT_FOUND',
            });
        }

        return sendResponse(res, {
            message: 'Support request',
            data: serializeTicket(ticket),
        });
    } catch (error) {
        next(error);
    }
};

export const updateSupportRequestForAdmin = async (req, res, next) => {
    try {
        const updates = {};
        const nextStatus = req.body.status;

        if (nextStatus) {
            updates.status = nextStatus;
            if (['resolved', 'closed'].includes(nextStatus)) {
                updates.closedAt = new Date();
            } else {
                updates.closedAt = null;
            }
        }
        if (req.body.priority) {
            updates.priority = req.body.priority;
        }
        if (typeof req.body.adminNotes === 'string') {
            updates.adminNotes = req.body.adminNotes.trim();
        }

        const ticket = await SupportRequest.findByIdAndUpdate(
            req.params.id,
            updates,
            { returnDocument: 'after' },
        )
            .populate('userId', 'name email role district city')
            .populate('assignedAdminId', 'name role');

        if (!ticket) {
            return sendResponse(res, {
                statusCode: 404,
                success: false,
                message: 'Support request not found',
                errorCode: 'SUPPORT_REQUEST_NOT_FOUND',
            });
        }

        return sendResponse(res, {
            message: 'Support request updated',
            data: serializeTicket(ticket),
        });
    } catch (error) {
        next(error);
    }
};
