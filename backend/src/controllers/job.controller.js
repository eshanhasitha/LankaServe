import { createJob, listJobs, acceptJob, rejectJob } from '../services/job.service.js';

export const create = async (req, res) => res.status(201).json({ success: true, data: await createJob(req.user._id, req.body) });
export const list = async (req, res) => res.json({ success: true, data: await listJobs(req.user) });
export const accept = async (req, res) => res.json({ success: true, data: await acceptJob(req.params.id, req.user._id) });
export const reject = async (req, res) => res.json({ success: true, data: await rejectJob(req.params.id) });
