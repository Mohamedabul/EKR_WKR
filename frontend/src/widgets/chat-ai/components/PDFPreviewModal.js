import React from 'react';
import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import PropTypes from 'prop-types';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 5,
  },
  border: {
    margin: 5,
    padding: 15,
    border: '0.5pt solid #CCCCCC',
    flex: 1,
  },
  title: {
    fontSize: 18,
    marginBottom: 6,
    fontFamily: 'Helvetica-Bold',
  },
  messageContainer: {
    marginVertical: 4,
  },
  message: {
    fontSize: 10,
    lineHeight: 1.2,
    fontFamily: 'Helvetica',
  },
});

const PDFPreviewModal = ({ messages, isOpen, onClose, onDownload }) => {
  if (!isOpen) return null;

  const PDFDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Add border to match exportToPDF */}
      <View style={styles.border}>
        <Text style={styles.title}>Chat Conversation</Text>
        {messages.map((message, index) => (
          <View key={index} style={styles.messageContainer}>
            <Text style={styles.message}>
              {message.type === 'ai' ? 'IQRA: ' : 'You: '}
              {/* Clean content similar to exportToPDF */}
              {message.content.replace(/\*\*/g, '')}
            </Text>
          </View>
        ))}
      </View>
    </Page>
  </Document>
);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[95vw] h-[90vh] flex flex-col">
        {/* Top bar with buttons */}
        <div className="flex justify-end gap-2 p-4 bg-gray-100 rounded-t-lg">
          <button
            onClick={onDownload}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
        
        {/* PDF Viewer Container */}
        <div className="flex-1 p-4 bg-white rounded-b-lg">
          <style>
            {`
              .react-pdf__Page__canvas {
                margin: 0 auto;
              }
              /* Hide all toolbars and buttons */
              .react-pdf__Toolbar,
              .rpv-core__toolbar,
              .rpv-core__minimal-button,
              .rpv-core__viewer,
              [data-testid="toolbar"],
              [role="toolbar"],
              .rpv-core__inner-pages {
                display: none !important;
              }
              /* Hide any buttons within the viewer */
              button[aria-label="Preview"],
              button[aria-label="Download"],
              .rpv-core__download-button,
              .rpv-core__preview-button {
                display: none !important;
              }
              /* Ensure PDF takes full space */
              .react-pdf__Document {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                height: 100%;
                overflow: auto;
              }
              /* Remove any default margins/padding */
              .react-pdf__Page {
                margin: 0 !important;
                padding: 0 !important;
              }
            `}
          </style>
          <PDFViewer 
            width="100%" 
            height="100%" 
            className="rounded border border-gray-200"
            showToolbar={false}
            navbarOnTop={false}
            toolbar={null}
          >
            <PDFDocument />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};

PDFPreviewModal.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(['user', 'ai']).isRequired,
      content: PropTypes.string.isRequired,
      isWelcomeMessage: PropTypes.bool,
    })
  ).isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired,
};

export default PDFPreviewModal;
