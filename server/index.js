const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const app = express();
const upload = multer({ dest: 'uploads/' }); // Temp storage for uploads

// Middleware
app.use(cors());
app.use(express.json());

// 1. MongoDB Connection
// Replace with your actual connection string or use local
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/Project";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

// Schema for storing Chat History
const ChatSchema = new mongoose.Schema({
    fileName: String,
    userQuestion: String,
    aiResponse: String,
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model('Chat', ChatSchema);

// 2. Routes

// Health Check
app.get('/', (req, res) => {
    res.send({ status: "Node Server Active" });
});

// Upload Endpoint: Receives file from React, sends to Python
// Upload Endpoint: Receives file from React, sends to Python
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    try {
        console.log(`📂 Node received file: ${req.file.originalname}`);

        // FIX: Convert "uploads/filename" to "G:\Project\server\uploads\filename"
        // This ensures Python can find it no matter where it is running.
        const absolutePath = path.resolve(req.file.path);
        console.log(`📍 Sending Absolute Path to Python: ${absolutePath}`);

        // Send the Full Path to Python
        const pythonResponse = await axios.post('http://127.0.0.1:8000/process-pdf', {
            filename: req.file.originalname,
            filePath: absolutePath 
        });

        res.json({ message: "File processed successfully", data: pythonResponse.data });

    } catch (error) {
        console.error("AI Service Error:", error.message);
        // Better error logging to see if Python refused the connection
        if (error.response) {
            console.error("Python Response Data:", error.response.data);
        }
        res.status(500).json({ error: "Failed to process PDF with AI" });
    }
});

// Chat Endpoint: User asks question -> Node saves to DB -> Node asks Python -> Returns Answer
app.post('/chat', async (req, res) => {
    const { question, fileName } = req.body;

    try {
        // 1. Ask Python AI
        const aiResponse = await axios.post('http://127.0.0.1:8000/ask', {
            question: question
        });

        const answer = aiResponse.data.answer;

        // 2. Save to MongoDB
        const newChat = new Chat({
            fileName,
            userQuestion: question,
            aiResponse: answer
        });
        await newChat.save();

        // 3. Respond to User
        res.json({ answer: answer });

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: "AI Service is offline or busy" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Node Server running on port ${PORT}`));