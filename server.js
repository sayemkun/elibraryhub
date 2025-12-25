const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// --- 1. CONFIGURE FILE STORAGE ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// --- 2. SERVE STATIC FILES ---
app.use('/uploads', express.static('uploads'));

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/elibrary")
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// --- SCHEMAS ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  pdfUrl: { type: String },
  coverImage: { type: String } 
});
const Book = mongoose.model('Book', bookSchema);

const authorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    biography: { type: String },
    photoUrl: { type: String }
});
const Author = mongoose.model('Author', authorSchema);

// --- ROUTES ---

// LOGIN / REGISTER
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user) {
      if (user.password === password) {
        res.json({ message: "Welcome back!", user });
      } else {
        res.status(400).json({ message: "Incorrect Password" });
      }
    } else {
      const newUser = new User({ username, password });
      await newUser.save();
      res.json({ message: "Account Created & Logged In", user: newUser });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/forgot-password', async (req, res) => {
  res.json({ message: "If this account exists, a reset link has been sent." });
});

// UPDATE USER SETTINGS
app.put('/update-user', async (req, res) => {
  const { currentUsername, newUsername, newPassword } = req.body;
  try {
    const user = await User.findOne({ username: currentUsername });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (newUsername) user.username = newUsername;
    if (newPassword) user.password = newPassword;

    await user.save();
    res.json({ status: "ok", message: "Profile Updated Successfully", user });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "Username already taken" });
    res.status(500).json({ message: "Error updating profile" });
  }
});

// --- BOOK ROUTES ---
app.get('/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/books/category/:categoryName', async (req, res) => {
  try {
    const books = await Book.find({ category: req.params.categoryName });
    res.json({ status: "ok", data: books });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const uploadFields = upload.fields([{ name: 'pdf', maxCount: 1 }, { name: 'cover', maxCount: 1 }]);

app.post('/books', uploadFields, async (req, res) => {
  try {
    const { title, author, description, category } = req.body;
    const pdfUrl = req.files['pdf'] ? req.files['pdf'][0].path : null; 
    const coverImage = req.files['cover'] ? req.files['cover'][0].path : null;

    if (!title || !author || !category) return res.status(400).json({ message: "Missing required fields" });
    
    const newBook = new Book({ title, author, description, category, pdfUrl, coverImage });
    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/books/:id', uploadFields, async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      author: req.body.author,
      description: req.body.description,
      category: req.body.category
    };
    if (req.files['pdf']) updateData.pdfUrl = req.files['pdf'][0].path;
    if (req.files['cover']) updateData.coverImage = req.files['cover'][0].path;

    const updatedBook = await Book.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedBook);
  } catch (error) {
    res.status(500).json({ message: "Error updating book" });
  }
});

app.delete('/books/:id', async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting book" });
  }
});

// --- AUTHOR ROUTES ---

app.get('/authors', async (req, res) => {
    try {
        const authors = await Author.find();
        res.json(authors);
    } catch (err) {
        res.status(500).json({ message: "Error fetching authors" });
    }
});

app.post('/authors', upload.single('photo'), async (req, res) => {
    try {
        const { name, biography } = req.body;
        const photoUrl = req.file ? req.file.path : null;

        const newAuthor = new Author({ name, biography, photoUrl });
        await newAuthor.save();
        res.json(newAuthor);
    } catch (err) {
        res.status(500).json({ message: "Error adding author" });
    }
});

// NEW: Update Author
app.put('/authors/:id', upload.single('photo'), async (req, res) => {
    try {
        const { name, biography } = req.body;
        const updateData = { name, biography };
        if (req.file) {
            updateData.photoUrl = req.file.path;
        }
        const updatedAuthor = await Author.findByIdAndUpdate(req.params.id, updateData, { new: true });
        res.json(updatedAuthor);
    } catch (err) {
        res.status(500).json({ message: "Error updating author" });
    }
});

// NEW: Delete Author
app.delete('/authors/:id', async (req, res) => {
    try {
        await Author.findByIdAndDelete(req.params.id);
        res.json({ message: "Author deleted" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting author" });
    }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

