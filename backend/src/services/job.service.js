import Job from '../models/Job.model.js';

export const createJob = (customerId, body) =>
  Job.create({ ...body, customerId, status: 'pending' });

export const listJobs = (user) => {
  if (user.role === 'customer') return Job.find({ customerId: user._id });
  if (user.role === 'provider') return Job.find({ providerId: user._id });
  return Job.find();
};

export async function acceptJob(jobId, providerId) {
  const job = await Job.findById(jobId);
  if (!job || job.status !== 'pending') throw new Error('Job not available');
  job.providerId = providerId;
  job.status = 'accepted';
  await job.save();
  return job;
}

export async function rejectJob(jobId) {
  const job = await Job.findById(jobId);
  if (!job) throw new Error('Job not found');
  job.providerId = null;
  job.status = 'pending';
  await job.save();
  return job;
}
