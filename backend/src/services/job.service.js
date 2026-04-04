import Job from '../models/Job.model.js';
import { generateSecureQR, verifySecureQR, sha256 } from '../utils/qr.js';

export async function acceptJob(jobId, providerId) {
  const job = await Job.findById(jobId).select('+qrTokenHash');
  if (!job || job.status !== 'pending') throw new Error('Job not available');
  const qr = generateSecureQR({ jobId: String(job._id), providerId: String(providerId), type: 'arrival' });
  job.providerId = providerId;
  job.status = 'accepted';
  job.qrTokenHash = qr.tokenHash;
  job.qrTokenExpiresAt = qr.expiresAt;
  job.qrTokenUsedAt = null;
  await job.save();
  return { job, qrToken: qr.token, qrExpiresAt: qr.expiresAt };
}

export async function scanArrivalQR(jobId, token) {
  const job = await Job.findById(jobId).select('+qrTokenHash');
  if (!job || job.status !== 'accepted') throw new Error('Job not ready for scan');
  verifySecureQR(token);
  if (sha256(token) !== job.qrTokenHash) throw new Error('QR mismatch');
  if (!job.qrTokenExpiresAt || job.qrTokenExpiresAt < new Date()) throw new Error('QR expired');
  if (job.qrTokenUsedAt) throw new Error('QR already used');
  job.status = 'arrived';
  job.qrTokenUsedAt = new Date();
  await job.save();
  return job;
}

export async function startJob(jobId, providerId) {
  const job = await Job.findOne({ _id: jobId, providerId });
  if (!job || job.status !== 'arrived') throw new Error('Job cannot be started');
  job.status = 'ongoing';
  await job.save();
  return job;
}

export async function confirmCompletion(jobId, userId, role) {
  const job = await Job.findById(jobId);
  if (!job || !['ongoing', 'completed'].includes(job.status)) throw new Error('Invalid status');
  if (role === 'provider') job.providerCompletion = true;
  if (role === 'customer') job.customerCompletion = true;
  await job.save();
  return job;
}

export async function finalizeCompletion(jobId) {
  const job = await Job.findById(jobId);
  if (!job || !job.providerCompletion || !job.customerCompletion) throw new Error('Dual confirmation required');
  job.status = 'completed';
  await job.save();
  return job;
}
