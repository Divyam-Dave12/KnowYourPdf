import { useState } from "react";
import axios from "axios";
import "./App.css";

// Import the new components
import FileUpload from "./components/FileUpload";
import ChatInterface from "./components/ChatInterface";

const API_BASE_URL = "http://127.0.0.1:8000";

function App() {
  // --- State Management ---
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hello! Upload a PDF to start chatting with it." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Handlers ---
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/process-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: `✅ PDF "${response.data.filename}" processed! Ask me anything.` }
      ]);
    } catch (error) {
      console.error("Upload failed", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "❌ Error processing PDF." }
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/ask`, { question: userMessage });
      setMessages((prev) => [...prev, { role: "bot", text: response.data.answer }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: "❌ Error fetching answer." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <div className="app-container">
      {/* Sidebar Container */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>PDF Chat</h2>
        </div>
        
        {/* Modular FileUpload Component */}
        <FileUpload 
          handleFileChange={handleFileChange}
          isUploading={isUploading}
          file={file}
        />
      </div>

      {/* Modular ChatInterface Component */}
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