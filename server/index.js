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

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- 1. MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/Project";

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Node.js: MongoDB Connected"))
    .catch(err => console.error("❌ Node.js: MongoDB Error:", err));

// --- 2. New Schema (Supports Chat History) ---
// This groups messages together so we can have "Threads" like ChatGPT
const ChatSessionSchema = new mongoose.Schema({
    title: String, // e.g., "Summary of React..."
    updated_at: { type: Date, default: Date.now },
    messages: [{
        role: String, // 'user' or 'bot'
        text: String,
        timestamp: { type: Date, default: Date.now }
    }]
});
const ChatSession = mongoose.model('ChatSession', ChatSessionSchema);


// --- 3. Routes ---

// Health Check
app.get('/', (req, res) => {
    res.send({ status: "Node Server Active" });
});

// --- A. Upload Endpoint (Your Original Logic) ---
// Keeps your specific file path handling for Python
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");

    try {
        console.log(`📂 Node received file: ${req.file.originalname}`);

        // Resolve absolute path for Python
        const absolutePath = path.resolve(req.file.path);
        console.log(`📍 Sending Absolute Path to Python: ${absolutePath}`);

        // Send to Python AI
        const pythonResponse = await axios.post('http://127.0.0.1:8000/process-pdf', {
            filename: req.file.originalname,
            filePath: absolutePath 
        });

        res.json({ message: "File processed successfully", data: pythonResponse.data });

    } catch (error) {
        console.error("AI Service Error:", error.message);
        if (error.response) {
            console.error("Python Response Data:", error.response.data);
        }
        res.status(500).json({ error: "Failed to process PDF with AI" });
    }
});

// --- B. History Endpoints (For Sidebar) ---

// 1. Get List of All Chats (Summary)
app.get('/api/history', async (req, res) => {
    try {
        // Fetch only titles and dates, sorted by newest first
        const chats = await ChatSession.find().sort({ updated_at: -1 }).select('title updated_at');
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// 2. Get Single Chat Details (When user clicks sidebar)
app.get('/api/history/:id', async (req, res) => {
    try {
        const chat = await ChatSession.findById(req.params.id);
        res.json(chat);
    } catch (error) {
        res.status(404).json({ error: "Chat not found" });
    }
});

// --- C. Chat Endpoint (Integrated Logic) ---
// Handles asking Python + Saving to MongoDB History
app.post('/api/ask', async (req, res) => {
    const { question, chatId } = req.body;

    try {
        // 1. Get Answer from Python AI
        // We assume Python is running on port 8000
        const aiResponse = await axios.post('http://127.0.0.1:8000/ask', {
            question: question
        });
        const botAnswer = aiResponse.data.answer;

        // 2. Create Message Objects
        const userMsg = { role: "user", text: question, timestamp: new Date() };
        const botMsg = { role: "bot", text: botAnswer, timestamp: new Date() };

        // 3. Save to MongoDB
        let chatSession;

        if (chatId) {
            // CASE 1: Append to existing chat
            chatSession = await ChatSession.findByIdAndUpdate(
                chatId,
                { 
                    $push: { messages: { $each: [userMsg, botMsg] } },
                    $set: { updated_at: new Date() }
                },
                { new: true } // Return updated doc
            );
        } else {
            // CASE 2: Create NEW chat session
            // Auto-generate title from first few words
            const title = question.split(' ').slice(0, 6).join(' ') + "..."; 
            
            chatSession = new ChatSession({
                title: title,
                messages: [userMsg, botMsg]
            });
            await chatSession.save();
        }

        // 4. Return result to Frontend
        // We include chatId so the frontend knows which conversation we are in
        res.json({ 
            answer: botAnswer, 
            chatId: chatSession._id 
        });

    } catch (error) {
        console.error("Chat Error:", error.message);
        res.status(500).json({ error: "AI Service is offline or busy" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Node Server running on port ${PORT}`));