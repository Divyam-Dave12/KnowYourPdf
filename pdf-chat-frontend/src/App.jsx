import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaPlus, FaHistory } from "react-icons/fa";
import "./App.css";

import FileUpload from "./components/FileUpload";
import ChatInterface from "./components/ChatInterface";

// --- CONFIGURATION ---
// 1. For Chat & History (Node.js)
const NODE_API_URL = "http://127.0.0.1:5000/api"; 

// 2. For File Uploads (Node.js)
const UPLOAD_URL = "http://127.0.0.1:5000/upload";

function App() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hello! Upload a PDF or select a chat to begin." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // History State
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  // 1. Fetch History from Node.js
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      // FIX: Use NODE_API_URL instead of API_BASE_URL
      const res = await axios.get(`${NODE_API_URL}/history`);
      setChatHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  // 2. Load Chat from Node.js
  const loadChat = async (id) => {
    setIsLoading(true);
    try {
      // FIX: Use NODE_API_URL
      const res = await axios.get(`${NODE_API_URL}/history/${id}`);
      setMessages(res.data.messages);
      setCurrentChatId(id);
    } catch (err) {
      console.error("Failed to load chat", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. New Chat
  const startNewChat = () => {
    setMessages([{ role: "bot", text: "✨ New chat started. Upload a PDF." }]);
    setCurrentChatId(null);
    setFile(null);
  };

  // 4. Send Message (via Node.js)
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setInput("");
    
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      // FIX: Use NODE_API_URL
      const response = await axios.post(`${NODE_API_URL}/ask`, { 
        question: userMessage,
        chatId: currentChatId
      });

      setMessages((prev) => [...prev, { role: "bot", text: response.data.answer }]);
      
      if (!currentChatId && response.data.chatId) {
        setCurrentChatId(response.data.chatId);
        fetchHistory(); // Refresh sidebar
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: "❌ Error. Ensure Node & Python are running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Upload File (via Node.js)
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // FIX: Use UPLOAD_URL
      const response = await axios.post(UPLOAD_URL, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages((prev) => [...prev, { role: "bot", text: `✅ PDF "${response.data.data.filename}" processed!` }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "bot", text: "❌ Error processing PDF." }]);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={startNewChat}>
            <FaPlus /> New Chat
          </button>
        </div>
        
        <FileUpload handleFileChange={handleFileChange} isUploading={isUploading} file={file} />

        <hr className="sidebar-divider" />
        
        <div className="history-section">
          <h4 style={{ color: "#aaa", fontSize: "0.8rem", paddingLeft: "10px" }}>Recent Chats</h4>
          {chatHistory.map((chat) => (
            <div 
              key={chat._id} 
              className={`history-item ${chat._id === currentChatId ? "active" : ""}`}
              onClick={() => loadChat(chat._id)}
            >
              <FaHistory style={{ marginRight: "8px", fontSize: "0.8rem" }} />
              {chat.title}
            </div>
          ))}
        </div>
      </div>

      <ChatInterface 
        messages={messages} 
        isLoading={isLoading} 
        input={input} 
        setInput={setInput} 
        handleSend={handleSend} 
      />
    </div>
  );
}

export default App;