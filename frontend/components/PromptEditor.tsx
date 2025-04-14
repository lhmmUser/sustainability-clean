// components/PromptEditor.tsx

import React from "react";

interface PromptEditorProps {
  prompt: string; // The initial prompt passed from the parent
  onPromptChange: (updatedPrompt: string) => void; // Function to handle prompt change
}

const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onPromptChange,
}) => {
  const handlePromptChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    onPromptChange(event.target.value); // Update the prompt in the parent component
  };

  return (
    <div className="bg-white text-black p-4 rounded shadow-md">
      <h2 className="text-lg font-semibold">Edit Your Prompt</h2>
      <textarea
        className="w-full p-2 border border-gray-300 rounded mt-4"
        rows={8}
        value={prompt}
        onChange={handlePromptChange}
        placeholder="Edit the prompt here..."
      />
    </div>
  );
};

export default PromptEditor;
