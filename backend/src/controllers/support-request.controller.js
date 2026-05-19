import SupportRequest from '../models/SupportRequest.model.js';
import { sendResponse } from '../utils/response.js';

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
        category: ticket.category,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        statusLabel: statusLabels[ticket.status] || ticket.status,
        priority: ticket.priority,
        attachments: ticket.attachments || [],
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        closedAt: ticket.closedAt,
    };
}

export const createSupportRequest = async (req, res, next) => {
    try {
        const ticket = await SupportRequest.create({
            ticketNumber: await generateTicketNumber(),
            userId: req.user._id,
            role: req.user.role,
            category: req.body.category,
            subject: req.body.subject || req.body.category,
            message: req.body.message,
            attachments: req.body.attachments || [],
        });

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
            .limit(limit);

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
        const ticket = await SupportRequest.findOne({ _id: req.params.id, userId: req.user._id });
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
