const { v4: uuidv4 } = require("uuid");

const redis = require("../redis/redisClient");

const { trace } = require("@opentelemetry/api");

/** ENQUEUE A JOB */
exports.enqueueJob = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("enqueue_job");
  try {
    const { type, data, priority = "normal", dependencies = [] } = req.body;
    const jobId = `job:${uuidv4()}`;

    const queueName =
      priority === "high" ? "high_priority_jobs" : "normal_jobs";

    span.setAttribute({ type, data, priority, dependencies, jobId });

    await redis.lpush(queueName, jobId);

    await redis.hmset(jobId, {
      status: "PENDING",
      type,
      data: JSON.stringify(data),
      retries: 0,
      progress: 0,
      created_at: Date.now(),
    });

    for (const dependency of dependencies) {
      await redis.sadd(`${jobId}:dependencies`, dependency);
      await redis.sadd(`${dependency}:dependents`, jobId);
    }

    res.status(201).json({ success: true, message: "Job enqueued", jobId });
  } catch (error) {
    span.recordException(error);
    console.error("Error enqueuing job: ", error);
    res.status(500).json({ success: false, message: "Failed to enqueue job" });
  } finally {
    span.end();
  }
};

/** CHECK JOB STATUS */
exports.getJobStatus = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("get_job_status");
  try {
    const { jobId } = req.params;
    const job = await redis.hgetall(jobId);

    span.setAttribute({ jobId });
    if (!job || Object.keys(job).length === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.status(200).json({ success: true, job });
  } catch (error) {
    span.recordException(error);
    console.error("Error fetching job status: ", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch job status" });
  } finally {
    span.end();
  }
};

/** GET ALL JOBS (DASHBOARD) */
exports.getAllJobs = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("get_all_jobs");
  try {
    const jobKeys = await redis.keys("job:*");
    const jobs = [];

    console.log({ jobKeys });

    for (const key of jobKeys) {
      const job = await redis.hgetall(key);
      jobs.push({ jobId: key, ...job });
    }

    res.status(200).json({ success: true, jobs });
  } catch (error) {
    span.recordException(error);
    console.error("Error in getAllJobs Controller: ", error);
  } finally {
    span.end();
  }
};

/** GET ALL JOB IDS */
exports.getAllJobIds = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("get_all_job_ids");
  try {
    // Fetch all job keys
    const jobKeys = await redis.keys("job:*");

    // Return only ids
    res.status(200).json({ success: true, jobIds: jobKeys });
  } catch (error) {
    span.recordException(error);
    console.error("Error fetching job IDs: ", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch job IDs" });
  } finally {
    span.end();
  }
};

exports.getJobResult = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("get_job_result");
  try {
    const { jobId } = req.params;
    const job = await redis.hgetall(jobId);

    span.setAttributes({ jobId });

    if (!job || Object.keys(job).length === 0) {
      return res.status(404).json({ success: false, message: "job not found" });
    }

    return res.status(200).json({ success: true, result: job.result });
  } catch (error) {
    span.recordException(error);
    console.error("Error fetching job result: ", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch job result" });
  }
};

exports.getJobStats = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("get_job_stats");
  try {
    const jobKeys = await redis.keys("job:*");
    const stats = {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      FAILED: 0,
    };

    for (const key of jobKeys) {
      const status = await redis.hget(key, "status");
      stats[status] = (stats[status] || 0) + 1;
    }

    return res.status(200).json({ success: true, stats });
  } catch (error) {
    span.recordException(error);
    console.error("Error in getJobStats: ", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get job stats" });
  } finally {
    span.end();
  }
};

exports.cancelJob = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("cancel_job");
  try {
    const { jobId } = req.params;
    const job = await redis.hgetall(jobId);

    if (!job || Object.keys(job).length === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    span.setAttributes({ jobId });

    // only allow cancellation if job is pending or processing
    if (job.status === "PENDING" || job.status === "PROCESSING") {
      await redis.hset(jobId, "status", "CANCELLED");
      return res.status(200).json({ success: true, message: "Job cancelled" });
    }

    res.status(400).json({
      success: false,
      message: "Cannot cancel completed or failed jobs",
    });
  } catch (error) {
    span.recordException(error);
    console.error("Error in cancel job: ", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to cancel the job" });
  } finally {
    span.end();
  }
};

exports.deleteJob = async (req, res) => {
  const span = trace.getTracer("redis-job-queue").startSpan("delete_job");
  try {
    const { jobId } = req.params;

    span.setAttributes({ jobId });

    // Delete the job
    const jobExists = await redis.exists(jobId);

    if (!jobExists) {
      return res.status(404).json({ success: false, message: "job not found" });
    }

    // Remove job metadata and dependencies
    await redis.del(jobId);
    await redis.del(`${jobId}:dependencies`);
    await redis.del(`${jobId}:dependents`);

    res
      .status(200)
      .json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    span.recordException(error);
    console.error("Error deleting the job: ", err);
    res.status(500).json({ success: false, message: "Failed to delete job" });
  } finally {
    span.end();
  }
};
