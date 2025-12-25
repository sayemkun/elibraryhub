const mongoose = require("mongoose");

// This defines the structure of your book data
const BookDetailsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    author: { type: String, required: true },
    category: { type: String, required: true }, // This is essential for your 5 buttons
    pdf: { type: String, required: true },      // This stores the filename
  },
  { collection: "BookDetails" }
);

mongoose.model("BookInfo", BookDetailsSchema);