// components/MessageInput.tsx

import React, { useState } from "react";

interface MessageInputProps {
  onMessageSent: (message: string) => void; // Function to handle user message
}

const MessageInput: React.FC<MessageInputProps> = ({
  onMessageSent,
  isLoading,
}) => {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (!message.trim()) return;

    onMessageSent(message); // Pass the message back to the parent component
    setMessage(""); // Clear the input field
  };

  return (
    <div className="bg-white text-black w-full p-4 rounded shadow-md">
      <textarea
        className="w-full p-2 border border-gray-300 rounded"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter your message..."
      />
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded w-full"
        onClick={handleSendMessage}
        disabled={!message.trim()}
      >
        {isLoading ? "Loading..." : "Send Message"}
      </button>
    </div>
  );
};

export default MessageInput;
