const Redis = require("ioredis");

// Load env variables
require("dotenv").config();

const redis = new Redis.Cluster([
  { host: "10.0.2.66", port: 6379 },
  { host: "10.0.3.99", port: 6379 },
  { host: "10.0.2.37", port: 6379 },
  { host: "10.0.3.18", port: 6379 },
  { host: "10.0.2.221", port: 6379 },
  { host: "10.0.3.157", port: 6379 },
]);

module.exports = redis;
