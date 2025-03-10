import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import jsPDF from 'jspdf';
import PDFPreviewModal from './PDFPreviewModal';
import { 
  PictureAsPdfRounded, 
  TableChart, 
  LibraryBooks, 
  Slideshow, 
  Article, 
  AutoStoriesOutlined, 
  FileCopy 
} from '@mui/icons-material';
import '../styles.css';
import ReactMarkdown from "react-markdown";

const WELCOME_MESSAGE =
  "Provide Document and Start Conversation";

const ChatWindow = ({ messages = [], onAddMessage }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const welcomeMessageShownRef = useRef(false);
  const lastScrollTimeRef = useRef(Date.now());
  const pendingScrollRef = useRef(false);

  // Show welcome message when component mounts if messages are empty
  useEffect(() => {
    if (messages.length === 0 && !welcomeMessageShownRef.current) {
      welcomeMessageShownRef.current = true;
      if (onAddMessage) {
        onAddMessage({
          type: "ai",
          content: WELCOME_MESSAGE,
          isWelcomeMessage: true,
        });
      }
    }
  }, [messages.length, onAddMessage]);

  // Ensure welcome message is shown even if onAddMessage is not provided
  const displayMessages =
    messages.length === 0 && !onAddMessage
      ? [
          {
            type: "ai",
            content: WELCOME_MESSAGE,
            isWelcomeMessage: true,
          },
        ]
      : messages;

  const isNearBottom = () => {
    if (!containerRef.current) return true;
    const container = containerRef.current;
    const threshold = 150; // pixels from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      threshold
    );
  };

  const scrollToBottom = (force = false) => {
    if (!containerRef.current || !messagesEndRef.current) return;

    const now = Date.now();
    const timeSinceLastScroll = now - lastScrollTimeRef.current;

    // Always scroll on force, otherwise check conditions
    if (force || (shouldAutoScroll && !isUserScrolling)) {
      try {
        messagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest",
        });
        lastScrollTimeRef.current = now;
      } catch (error) {
        console.warn("ScrollIntoView failed:", error);
        // Fallback scrolling method
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }
  };

  const handleScroll = () => {
    if (!containerRef.current) return;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    setIsUserScrolling(true);

    // Set a new timeout
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
      setShouldAutoScroll(isNearBottom());
    }, 150);
  };

  // Effect for initial render
  useEffect(() => {
    scrollToBottom(true);
  }, []); // Only run once on mount

  // Effect for message changes
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]); // Run when messages change

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => {
        container.removeEventListener("scroll", handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, []);
  const getFileIcon = (fileType) => {
    const iconStyle = { 
      fontSize: '50px',
      padding: '7px',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      background: 'linear-gradient(145deg, #ffffff, #f5f5f5)'
    }; 
  
    switch(fileType.toLowerCase()) {
      case 'pdf':
        return <PictureAsPdfRounded sx={{...iconStyle, color: '#FF5252'}} />;
      case 'csv':
        return <TableChart sx={{...iconStyle, color: '#43A047'}} />;
      case 'docx':
      case 'doc':
        return <LibraryBooks sx={{...iconStyle, color: '#1E88E5'}} />;
      case 'ppt':
      case 'pptx':
        return <Slideshow sx={{...iconStyle, color: '#FF7043'}} />;
      case 'txt':
        return <Article sx={{...iconStyle, color: '#78909C'}} />;
      case 'xlsx':
      case 'xls':
        return <AutoStoriesOutlined sx={{...iconStyle, color: '#43B047'}} />;
      default:
        return <FileCopy sx={{...iconStyle, color: '#757575'}} />;
    }
  };
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = 30;
    const addPageBorder = () => {
      const pageHeight = doc.internal.pageSize.height;
      doc.setDrawColor(204, 204, 204);
      doc.setLineWidth(0.5);
      doc.rect(margin/2, margin/2, pageWidth - margin, pageHeight - margin);
  };
    addPageBorder();
    doc.addPage = (function(addPage) {
      return function() {
        addPage.apply(this, arguments);
        addPageBorder();
      };
    })(doc.addPage);
  

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Chat Conversation', pageWidth/2, 20, { align: 'center' });
    

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    displayMessages.forEach((message) => {
        const sender = message.type === 'ai' ? 'IQRA: ' : 'You: ';
        const cleanContent = message.content.replace(/\*\*/g, '');
        const contentLines = doc.splitTextToSize(cleanContent, contentWidth - 10);

        if (yPosition + (contentLines.length * 4) + 2 > doc.internal.pageSize.height - margin) {
            doc.addPage();
            addPageBorder();
            yPosition = margin;
        }

        doc.text(`${sender}${contentLines.join('\n')}`, margin, yPosition);
        yPosition += contentLines.length * 5 + 2;
    });

    doc.save(`chat-export-${new Date().toISOString()}.pdf`);
};  const handlePreviewClick = () => {
    setIsPreviewOpen(true);
  };
  return (
    <>
      <div
        ref={containerRef}
        className="flex flex-col h-[750px] w-[1600px] overflow-y-auto bg-white rounded-lg p-4 space-y-4 shadow-lg border"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "#1976d2 transparent",
        }}
      >
      
        <div style={{ 
          position: 'absolute', 
          top: '10px', 
          right: '10px', 
          zIndex: 1000,
          display: 'flex',
          gap: '8px'
        }}>
          {!isPreviewOpen && (
  <>
    <button
      onClick={handlePreviewClick}
      style={{
        padding: '8px 16px',
        backgroundColor: '#1976d2',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'background-color 0.2s ease',
        boxShadow: '0 2px 4px rgba(25, 118, 210, 0.2)'
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
    >
      Preview
    </button>
    <button
      onClick={exportToPDF}
      style={{
        padding: '8px 16px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        alignItems: 'center',
        gap: '8px',
        transition: 'background-color 0.2s ease',
        boxShadow: '0 2px 4px rgba(76, 175, 80, 0.2)'
      }}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#43a047'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4caf50'}
    >
      Download
    </button>
  </>
)}

        </div>
        {displayMessages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              message.type === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.type === "user"
                  ? "bg-blue-100"
                  : message.isAnalysis 
                    ? "bg-gray-50 text-black" 
                    : "bg-gray-100"
              }`}
              style={{
                color: message.isAnalysis ? '#000000' : 'inherit',
                fontWeight: message.isAnalysis ? '400' : 'inherit'
              }}
            >
              {message.isFile ? (
  <div className="prose">
    <div className="flex items-center gap-2">
      {getFileIcon(message.content.split('.').pop())}
      {message.type === "ai" && (
        <span className="text-lg font-bold ml-2" style={{ color: '#757575' }}>Response from <strong><span className="bg-gradient-to-r from-indigo-600 to-pink-500 text-transparent bg-clip-text">IQRA AI</span></strong>
</span>
      )}
    </div>
    <ReactMarkdown className="prose markdown-content" components={{
    p: ({ node, ...props }) => (
      <p style={{ lineHeight: "1.8", marginBottom: "1em", marginTop: "1em" }} {...props} />
    ),
  }}>{message.content}</ReactMarkdown>
  </div>
) : (    
  <ReactMarkdown className="prose markdown-content"
  components={{
    p: ({ node, ...props }) => (
      <p style={{ lineHeight: "1.8", marginBottom: "1em", marginTop: "1em" }} {...props} />
    ),
  }}>{message.content}</ReactMarkdown>
)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
      <PDFPreviewModal
        messages={displayMessages}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onDownload={exportToPDF}
      />
    </>
  );
};

ChatWindow.propTypes = {
  /**
   * Array of message objects to display in the chat window
   */
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      /** Type of message - either 'user' or 'ai' */
      type: PropTypes.oneOf(["user", "ai"]).isRequired,
      /** Content of the message */
      content: PropTypes.string.isRequired,
      /** Flag to indicate if this is the welcome message */
      isWelcomeMessage: PropTypes.bool,
    })
  ),
  /**
   * Callback function to add a new message
   * @param {Object} message - The message object to add
   * @param {('user'|'ai')} message.type - Type of the message
   * @param {string} message.content - Content of the message
   * @param {boolean} [message.isWelcomeMessage] - Whether this is a welcome message
   */
  onAddMessage: PropTypes.func,
};

ChatWindow.defaultProps = {
  messages: [],
  onAddMessage: undefined,
};

export default ChatWindow;
