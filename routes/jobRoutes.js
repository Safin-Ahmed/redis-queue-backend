const express = require("express");
const router = express.Router();
const jobController = require("../controllers/jobController");

// ENQUEUE A JOB
router.post("/", jobController.enqueueJob);

// GET ALL JOBS
router.get("/", jobController.getAllJobs);

// GET ALL JOB IDS
router.get("/ids", jobController.getAllJobIds);

// GET JOB STATS
router.get("/stats", jobController.getJobStats);

// GET JOB STATUS
router.get("/:jobId", jobController.getJobStatus);

// GET JOB RESULT
router.get("/:jobId/result", jobController.getJobResult);

// DELETE A JOB
router.delete("/:jobId", jobController.deleteJob);

// CANCEL A JOB
router.get("/:jobId/cancel", jobController.cancelJob);

module.exports = router;
