const redis = require("../redis/redisClient");

exports.getWorkerHealth = async (req, res) => {
  try {
    const nodes = redis.nodes("master"); // Get all master nodes
    let workerKeys = [];

    // Collect worker keys from all master nodes
    for (const node of nodes) {
      const keys = await node.keys("worker:*");
      workerKeys.push(...keys);
    }

    workerKeys = [...new Set(workerKeys)]; // Remove duplicates

    const workers = [];

    // Fetch worker data and determine health status
    for (const key of workerKeys) {
      const worker = await redis.hgetall(key);
      if (worker && worker.last_seen) {
        const isAlive = Date.now() - parseInt(worker.last_seen, 10) < 10000;
        workers.push({
          worker_id: key,
          queue: worker.queue,
          status: isAlive ? "ALIVE" : "DEAD",
          last_seen: new Date(parseInt(worker.last_seen, 10)).toISOString(),
        });
      }
    }

    res.status(200).json({ success: true, workers });
  } catch (error) {
    console.error("Error fetching worker health: ", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch worker health" });
  }
};
