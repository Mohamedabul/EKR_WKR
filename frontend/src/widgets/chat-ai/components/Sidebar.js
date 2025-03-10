import React, { useState } from 'react';

const Sidebar = ({ isOpen, toggleSidebar, conversations }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);

  const filteredConversations = conversations.filter(conv =>
    conv.messages.some(interaction =>
      interaction.query?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  

  if (!isOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-lg hover:bg-gray-100 transition-all duration-300"
        aria-label="Toggle sidebar"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    );
  }

  return (
    <>
      {/* Sidebar Panel */}
      <div className="fixed top-0 left-0 h-full w-72 bg-white/95 shadow-lg z-40">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800"><span style={{ fontWeight: 'bold' }}>IQRA-AI</span></h2>
          <button
            onClick={toggleSidebar}
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="ml-2 text-sm font-medium">Close Sidebar</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <input
              type="search"
              placeholder="Search conversations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Conversation History */}
        <div className="p-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Conversation History</h3>
          <div className="space-y-2">
            {filteredConversations.map((conv, index) => (
              <div
                key={index}
                className={`rounded-lg transition-all duration-200 ${
                  selectedConversation === conv._id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'hover:bg-gray-50 border-transparent'
                } border p-3 cursor-pointer`}
                onClick={() => setSelectedConversation(conv._id)}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-gray-900 truncate">{conv._id}</h4>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                {selectedConversation === conv._id && (
  <div className="mt-3 space-y-3 text-sm">
    {conv.messages.map((interaction, i) => (
      <div key={i} className="pl-2 border-l-2 border-blue-200">
        {interaction.type === 'qa' && (
          <>
            <p className="text-gray-800 font-medium mb-1">
              <span className="text-blue-600 mr-2">Q:</span>
              {interaction.query}
            </p>
            <p className="text-gray-600">
              <span className="text-green-600 mr-2">A:</span>
              {interaction.response}
            </p>
          </>
        )}
      </div>
    ))}
  </div>
)}

              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
