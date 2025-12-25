const mongoose = require("mongoose");
require("dotenv").config();

// We removed the deprecated options (lines 5-7 in your image)
// because Mongoose 6+ does this automatically now.
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((err) => console.log("Connection Error:", err));