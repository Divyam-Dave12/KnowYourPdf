import React, { useRef, useEffect } from "react";
import { FaPaperPlane, FaRobot, FaUser } from "react-icons/fa";

const ChatInterface = ({ messages, isLoading, input, setInput, handleSend }) => {
  // Auto-scroll logic inside the chat component
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="chat-area">
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.role === "bot" ? "bot-bg" : "user-bg"}`}>
            <div className="message-content">
              <div className="avatar">
                {msg.role === "bot" ? <FaRobot /> : <FaUser />}
              </div>
              <div className="text-bubble">{msg.text}</div>
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

      {/* Input Area */}
      <div className="input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
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