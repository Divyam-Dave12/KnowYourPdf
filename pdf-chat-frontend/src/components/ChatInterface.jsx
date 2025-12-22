import React, { useRef, useEffect } from "react";
import { FaPaperPlane, FaRobot, FaUser } from "react-icons/fa";
import ReactMarkdown from "react-markdown"; // Import the markdown renderer

const ChatInterface = ({ messages, isLoading, input, setInput, handleSend }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Handle Enter to send, Shift+Enter for new line
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-area">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.role === "bot" ? "bot-bg" : "user-bg"}`}>
            <div className="message-content">
              <div className="avatar">
                {msg.role === "bot" ? <FaRobot /> : <FaUser />}
              </div>
              {/* Use ReactMarkdown to render the text */}
              <div className="text-bubble markdown-body">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message-row bot-bg">
            <div className="message-content">
              <div className="avatar"><FaRobot /></div>
              <div className="text-bubble">Thinking...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown} 
            placeholder="Send a message..."
            disabled={isLoading}
          />
          <button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <FaPaperPlane />
          </button>
        </div>
        <p className="disclaimer">AI can make mistakes. Check important info.</p>
      </div>
    </div>
  );
};

export default ChatInterface;