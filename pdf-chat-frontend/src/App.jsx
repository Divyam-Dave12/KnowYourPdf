import { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaHistory, FaEdit, FaCheck, FaTimes } from "react-icons/fa"; // Added Icons
import "./App.css";

import FileUpload from "./components/FileUpload";
import ChatInterface from "./components/ChatInterface";

const NODE_API_URL = "http://127.0.0.1:5000/api"; 
const UPLOAD_URL = "http://127.0.0.1:5000/upload";

function App() {
  const [messages, setMessages] = useState([{ role: "bot", text: "Hello! Upload a PDF or select a chat." }]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // History & Editing State
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [editingChatId, setEditingChatId] = useState(null); // Track which chat is being edited
  const [editTitle, setEditTitle] = useState("");           // Track the new title input

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${NODE_API_URL}/history`);
      setChatHistory(res.data);
    } catch (err) { console.error(err); }
  };

  const loadChat = async (id) => {
    if (editingChatId) return; // Prevent loading while editing
    setIsLoading(true);
    try {
      const res = await axios.get(`${NODE_API_URL}/history/${id}`);
      setMessages(res.data.messages);
      setCurrentChatId(id);
    } catch (err) { console.error(err); } 
    finally { setIsLoading(false); }
  };

  const startNewChat = () => {
    setMessages([{ role: "bot", text: "✨ New chat started. Upload a PDF." }]);
    setCurrentChatId(null);
    setFile(null);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${NODE_API_URL}/ask`, { 
        question: userMessage, chatId: currentChatId 
      });
      setMessages((prev) => [...prev, { role: "bot", text: response.data.answer }]);
      
      if (!currentChatId && response.data.chatId) {
        setCurrentChatId(response.data.chatId);
        fetchHistory(); 
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: "❌ Error. Ensure Node & Python are running." }]);
    } finally { setIsLoading(false); }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await axios.post(UPLOAD_URL, formData, { headers: { "Content-Type": "multipart/form-data" }});
      setMessages((prev) => [...prev, { role: "bot", text: `✅ PDF "${response.data.data.filename}" processed!` }]);
    } catch (error) { setMessages((prev) => [...prev, { role: "bot", text: "❌ Error processing PDF." }]); } 
    finally { setIsUploading(false); }
  };

  // --- NEW: Rename Logic ---
  const startEditing = (e, chat) => {
    e.preventDefault();    // Prevent default browser behavior
    e.stopPropagation();   // Stop click from triggering "loadChat"
    setEditingChatId(chat._id);
    setEditTitle(chat.title);
  };

  const cancelEditing = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingChatId(null);
    setEditTitle("");
  };

  const saveTitle = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!editTitle.trim()) return; // Don't save empty titles

    try {
      // Optimistic Update: Update UI immediately so it feels fast
      setChatHistory(prev => prev.map(chat => 
        chat._id === id ? { ...chat, title: editTitle } : chat
      ));
      
      // Close edit mode immediately
      setEditingChatId(null);

      // Send to server in background
      await axios.put(`${NODE_API_URL}/history/${id}`, { title: editTitle });

    } catch (error) {
      console.error("Failed to rename chat", error);
      // Optional: Revert change if server fails (advanced)
    }
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={startNewChat}><FaPlus /> New Chat</button>
        </div>
        <FileUpload handleFileChange={handleFileChange} isUploading={isUploading} file={file} />
        <hr className="sidebar-divider" />
        
        <div className="history-section">
          <h4 style={{ color: "#aaa", fontSize: "0.8rem", paddingLeft: "10px" }}>Recent Chats</h4>
          {chatHistory.map((chat) => (
            <div key={chat._id} className={`history-item ${chat._id === currentChatId ? "active" : ""}`} onClick={() => loadChat(chat._id)}>
              
              {editingChatId === chat._id ? (
                // EDIT MODE
                <div className="edit-mode-wrapper">
                  <input 
                    className="edit-title-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="edit-actions">
                    <button className="icon-btn save" onClick={(e) => saveTitle(e, chat._id)}><FaCheck /></button>
                    <button className="icon-btn cancel" onClick={(e) => cancelEditing(e)}><FaTimes /></button>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div className="view-mode-wrapper">
                  <div className="title-text">
                    <FaHistory style={{ marginRight: "8px", fontSize: "0.8rem" }} />
                    {chat.title}
                  </div>
                  <button className="icon-btn edit" onClick={(e) => startEditing(e, chat)}><FaEdit /></button>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>
      <ChatInterface messages={messages} isLoading={isLoading} input={input} setInput={setInput} handleSend={handleSend} />
    </div>
  );
}

export default App;