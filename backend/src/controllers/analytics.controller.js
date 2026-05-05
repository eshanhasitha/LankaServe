import { sendResponse } from '../utils/response.js';
import { getHeatmap, getOverview, getServiceDemand } from '../services/analytics.service.js';

export const heatmap = async (req, res, next) => {
    try {
        const data = await getHeatmap();
        return sendResponse(res, { message: 'Heatmap data', data });
    } catch (error) { next(error); }
};

export const overview = async (req, res, next) => {
    try {
        const data = await getOverview();
        return sendResponse(res, { message: 'Overview analytics', data });
    } catch (error) { next(error); }
};

export const services = async (req, res, next) => {
    try {
        const data = await getServiceDemand();
        return sendResponse(res, { message: 'Service demand analytics', data });
    } catch (error) { next(error); }
};
