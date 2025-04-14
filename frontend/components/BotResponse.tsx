// components/BotResponse.tsx

import React from "react";

interface BotResponseProps {
  response: string; // The response from the backend
  onFeedback: (feedback: number) => void; // Function to handle feedback
}

const BotResponse: React.FC<BotResponseProps> = ({ response, onFeedback }) => {
  const segments = response
    .split(/\n\n|•|#/)
    .filter((segment) => segment.trim() !== "");
  return (
    <div className="bg-white text-black p-4 rounded shadow-md mt-4">
      <h2 className="text-xl font-semibold">Bot Response</h2>
      <div className="mt-2">
        {segments.map((segment, index) => (
          <p key={index} className="mb-2">
            {segment.trim()}
          </p>
        ))}
      </div>
    </div>
  );
};

export default BotResponse;
