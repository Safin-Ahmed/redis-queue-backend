const Redis = require("ioredis");

// Load env variables
require("dotenv").config();

const redis = new Redis.Cluster([
  { host: "10.0.2.243", port: 6379 },
  { host: "10.0.2.218", port: 6379 },
  { host: "10.0.2.220", port: 6379 },
  { host: "10.0.3.189", port: 6379 },
  { host: "10.0.3.241", port: 6379 },
  { host: "10.0.3.97", port: 6379 },
]);

module.exports = redis;
