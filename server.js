require("./tracing");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const jobRoutes = require("./routes/jobRoutes");
const workerRoutes = require("./routes/workerRoutes");

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

const PORT = process.env.PORT || 4000;

// ROUTES
app.use("/api/jobs", jobRoutes);

app.use("/api/workers", workerRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
