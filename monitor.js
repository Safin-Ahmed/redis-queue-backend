require("dotenv").config();

const AWS = require("aws-sdk");

const redis = require("./redis/redisClient");

// AWS CONFIG
AWS.config.update({ region: "ap-southeast-1" });

const ec2 = new AWS.EC2();

// Scaling Parameters

// Jobs in the queue to trigger scale up
const SCALE_UP_THRESHOLD = 2;

// Jobs in the queue to trigger scale down
const SCALE_DOWN_THRESHOLD = 1;

// Maximum number of workers
const MAX_WORKERS = 5;

// Minimum number of workers
const MIN_WORKERS = 1;

// Launch Template for Workers
const LAUNCH_TEMPLATE_ID = "lt-0c975ceea10b5fdfe";

const getQueueLength = async (queueName) => {
  try {
    const nodes = redis.nodes("master"); // Get all master nodes
    let totalLength = 0;

    console.log({ nodes });

    // Fetch queue length from all master nodes and sum up
    for (const node of nodes) {
      const length = await node.llen(queueName).catch(() => 0);
      console.log(`Length for Node: ${node} under ${queueName}: ${length}`);
      totalLength += length;
    }
    console.log(`Total length for Queue Name: ${queueName}: ${totalLength}`);
    return totalLength;
  } catch (error) {
    console.error(`Error fetching queue length for ${queueName}: `, error);
    return 0;
  }
};

const getActiveInstances = async () => {
  try {
    const data = await ec2
      .describeInstances({
        Filters: [
          { Name: "tag:AutoScaleGroup", Values: ["WorkerInstance"] },
          { Name: "instance-state-name", Values: ["running", "pending"] },
        ],
      })
      .promise();

    return data.Reservations.flatMap((r) =>
      r.Instances.map((i) => i.InstanceId)
    );
  } catch (error) {
    console.error("Error fetching active instances: ", error);
    return [];
  }
};

// Scale up workers
const scaleUp = async (count) => {
  console.log(`Scaling up by ${count} workers...`);

  try {
    const response = await ec2
      .runInstances({
        LaunchTemplate: { LaunchTemplateId: LAUNCH_TEMPLATE_ID },
        MinCount: count,
        MaxCount: count,
        SubnetId: "subnet-00a9106dd9b703cbd",
      })
      .promise();

    const instanceIds = response.Instances.map((i) => i.InstanceId);

    await ec2
      .createTags({
        Resources: instanceIds,
        Tags: [{ key: "Role", Value: "worker" }],
      })
      .promise();

    console.log(`Launched instances: ${instanceIds.join(", ")}`);
  } catch (error) {
    console.error("Error scaling up: ", error);
  }
};

const scaleDown = async (count, activeInstances) => {
  console.log(`Scaling down by ${count} workers...`);
  const instancesToTerminate = activeInstances.slice(0, count);

  try {
    await ec2
      .terminateInstances({ instanceIds: instancesToTerminate })
      .promise();

    console.log(`Terminated instances: ${instancesToTerminate.join(", ")}`);
  } catch (error) {
    console.error("Error scaling down: ", error);
  }
};

const monitorQueue = async () => {
  try {
    // FETCH QUEUE LENGTHS
    const highPriorityJobs = await getQueueLength("high_priority_jobs");
    const normalJobs = await getQueueLength("normal_jobs");

    const totalJobs = highPriorityJobs + normalJobs;

    // Fetch Active instances
    const activeInstances = await getActiveInstances();

    console.log({ totalJobs, activeInstances });

    if (
      totalJobs >= SCALE_UP_THRESHOLD &&
      activeInstances.length < MAX_WORKERS
    ) {
      const scaleUpCount = Math.min(
        totalJobs - SCALE_UP_THRESHOLD,
        MAX_WORKERS - activeInstances.length
      );

      await scaleUp(scaleUpCount);
    } else if (
      totalJobs < SCALE_DOWN_THRESHOLD &&
      activeInstances.length > MAX_WORKERS
    ) {
      const scaleDownCount = Math.min(
        activeInstances.length - MIN_WORKERS,
        SCALE_DOWN_THRESHOLD - totalJobs
      );

      await scaleDown(scaleDownCount);
    } else {
      console.log("No scaling required");
    }
  } catch (error) {
    console.error(`Error in monitoring loop: `, error);
  }
};

// Run monitoring loop periodically
const startMonitoring = () => {
  console.log("Starting queue monitoring...");
  setInterval(monitorQueue, 1000);
};

if (require.main === module) {
  startMonitoring();
}

module.exports = { startMonitoring };
