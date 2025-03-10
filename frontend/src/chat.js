import React, { useState } from "react";
import "./App.css";
import "./animations.css";
import InputBox from "./widgets/chat-ai/components/InputBox";
import SubmitButton from "./widgets/chat-ai/components/SubmitButton";
import FileUploadButton from "./widgets/chat-ai/components/FileUploadButton";
import ChatWindow from "./widgets/chat-ai/components/ChatWindow";
import LoadingIndicator from "./widgets/chat-ai/components/LoadingIndicator";
import APIService from "./widgets/chat-ai/APIService";
import Sidebar from "./widgets/chat-ai/components/Sidebar";


// Initialize API service
const apiService = new APIService();

function AIChat() {
  // State management
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const apiService = new APIService();

  // Handle file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
  
    try {
      // Add a file upload message from the user
      setMessages(prev => [
        ...prev,
        {
          type: "user",
          content: file.name,
          isFile: true
        }
      ]);
  
      // Upload the file, passing the current conversationId (if any)
      const response = await apiService.uploadFile(file, conversationId);
  
      // If conversationId is not yet set, update it using the response
      if (!conversationId && response.conversation_id) {
        setConversationId(response.conversation_id);
      }
  
      // Add the AI response (file summary) to the messages list
      setMessages(prev => [
        ...prev,
        {
          type: "ai",
          content: response.summary || "File processed successfully",
          isFile: true
        }
      ]);
    } catch (err) {
      setError(err.message || "Failed to upload file");
      console.error("Upload Error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle input change
  const handleChange = (value) => {
    setInputValue(value);
    setError(null);
  };

  // Clear input
  const clearInput = () => {
    setInputValue("");
    setError(null);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!inputValue.trim()) {
      setError("Please enter a message");
      return;
    }
  
    // Add the user's query to the messages list
    const userMessage = { type: "user", content: inputValue.trim() };
    setMessages(prev => [...prev, userMessage]);
  
    // Clear the input and set the loading state
    setInputValue("");
    setIsLoading(true);
    setError(null);
  
    try {
      // Send the query to the backend along with the conversationId (if any)
      const response = await apiService.sendQuery(userMessage.content, conversationId);
  
      // Add the AI response to the chat
      const aiMessage = {
        type: "ai",
        content: response.content || response.response || "No response content",
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      let errorMessage = "An error occurred while processing your request.";
  
      if (err.message.includes("Invalid response format")) {
        errorMessage =
          "Received an invalid response from the AI service. Please try again.";
      } else if (err.message.includes("No response received")) {
        errorMessage =
          "Unable to connect to the AI service. Please check your connection and try again.";
      } else if (err.response?.status === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (err.response?.status === 503) {
        errorMessage =
          "AI service is temporarily unavailable. Please try again later.";
      }
  
      setError(errorMessage);
      console.error("API Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 p-4 flex flex-col items-center justify-center">
      <div className="w-[2900px] max-w-[1650px] bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-6 space-y-6 relative">
      <a 
        href="https://digitalt3.com/" 
        target="_blank" 
        rel="noopener noreferrer"
      >
        <img 
          src="/DigitalT3-logo.png" 
          alt="DigitalT3 Logo" 
          className="absolute top-8 left-20 w-48 h-12 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        />
      </a>
        {/* Add Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          conversations={conversations}
        />

        <h1 className="text-2xl font-bold text-gray-800 text-center mb-4">
        <span className="bg-gradient-to-r from-indigo-600 to-pink-500 text-transparent bg-clip-text">IQRA AI</span>
        </h1>

        {/* Chat Window */}
        <ChatWindow messages={messages} />

        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-sm text-center" role="alert">
            {error}
          </div>
        )}

        {/* Input Section */}
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-4 items-start">
            <div className="flex-1">
              <InputBox
                inputValue={inputValue}
                handleChange={handleChange}
                clearInput={clearInput}
              />
            </div>
            <FileUploadButton
              onFileSelect={handleFileUpload}
              acceptedFileTypes=".pdf,.csv,.docx,.ppt,.pptx,.txt,.xlsx"
              maxFileSize={100 * 1024 * 1024}
              disabled={isUploading}
            />
            <SubmitButton
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={!inputValue.trim() || isUploading}
            />
          </div>
        </div>

        {/* Loading Indicator */}
        {(isLoading || isUploading) && (
          <div className="flex justify-center">
            <LoadingIndicator size="sm" text={isUploading ? "Uploading file..." : "AI is thinking..."} />
          </div>
        )}
      </div>
    </div>
  );
}

export default AIChat;
