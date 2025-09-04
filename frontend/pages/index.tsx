import { useState, useEffect } from "react";
import MessageInput from "../components/MessageInput";
import BotResponse from "../components/BotResponse";
import { apiRequest } from "../utils/api";
import PromptEditor from "../components/PromptEditor";
import { ArrowLeft } from "lucide-react";

const Home = () => {
  const [response, setResponse] = useState<string>("");
  const [messageId, setMessageId] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(false);
  const [promptLoading, setPromptLoading] = useState<boolean>(false);
  const [messageLoading, setMessageLoading] = useState<boolean>(false);
  const [sessionID, setSessionID] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");

  // Existing useEffect and handler functions remain the same
  useEffect(() => {
    setSessionID(Math.random().toString(36).substr(2, 9));
  }, []);

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const result = await apiRequest("/get-prompt", "GET");
        if (result.success) {
          setPrompt(result.prompt);
        } else {
          alert("Error fetching prompt: " + result.error);
        }
      } catch (error: any) {
        alert("An error occurred: " + error.message);
      }
    };

    fetchPrompt();
  }, []);

  const handleFeedback = async (feedback: number) => {
    setLoadingFeedback(true);
    const feedbackData = { message_id: messageId, user_feedback: feedback };
    const result = await apiRequest("/update-feedback", "POST", feedbackData);

    if (result.success) {
      alert("Feedback submitted successfully!");
    } else {
      alert("Error submitting feedback: " + result.error);
    }
    setLoadingFeedback(false);
  };

  const handlePromptUpdate = async () => {
    if (!prompt.trim()) {
      alert("Please enter a valid prompt before submitting.");
      return;
    }

    setPromptLoading(true);

    const promptData = {
      prompt: prompt,
    };

    try {
      const result = await apiRequest("/update-prompt", "POST", promptData);

      if (result.success) {
        alert("Prompt updated successfully!");
      } else {
        alert("Error updating prompt: " + result.error);
      }
    } catch (error: any) {
      alert("An error occurred: " + error.message);
    }

    setPromptLoading(false);
  };

  const handleUserMessage = async (userMessage: string) => {
    if (!userMessage.trim()) {
      setResponse("Please enter a valid message.");
      return;
    }

    setMessageLoading(true);
    setResponse("");

    const messageData = {
      user_id: "123",
      incoming_message: userMessage,
      session_id: "your-session-id",
      name: "John",
      age: "30",
      gender: "male",
      city: "New York",
    };

    try {
      await apiRequest("/send-message", "POST", messageData, (chunk) => {
        console.log(chunk);
        setResponse((prev) => prev + chunk);
      });
    } catch (error: any) {
      setResponse("An error occurred: " + error.message);
    } finally {
      setMessageLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white p-2 flex flex-col relative">
      {/* Enhanced Dashboard Navigation */}
      <div className="fixed top-4 left-4 z-10">
        <a
          href="http://52.66.236.182/dashboard/"
          className="group flex items-center px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-blue-100"
        >
          <div className="flex items-center justify-center bg-blue-50 rounded-full p-2 group-hover:bg-blue-100 transition-colors">
            <ArrowLeft className="h-5 w-5 text-blue-600 group-hover:text-blue-700 transition-colors" />
          </div>
          <span className="ml-2 hidden md:block text-blue-600 group-hover:text-blue-700 transition-colors">
            Back to Dashboard
          </span>
        </a>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center mt-10">
        <h1 className="text-2xl font-bold text-center mb-4 text-blue-800 relative">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
            Sustainbility Prompter
          </span>
        </h1>
        <div className="w-full max-w-7xl flex flex-col md:flex-row bg-white shadow-2xl rounded-lg overflow-hidden">
          {/* Left Section: Prompt Editor */}
          <div className="w-full md:w-1/2 border-r border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 text-blue-700">
              Prompt Editor
            </h2>
            <PromptEditor prompt={prompt} onPromptChange={setPrompt} />
            <button
              className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 shadow-lg hover:shadow-xl"
              onClick={handlePromptUpdate}
              disabled={promptLoading}
            >
              {promptLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                "Submit"
              )}
            </button>
          </div>

          {/* Right Section: Bot Interaction */}
          <div className="w-full md:w-1/2 p-6">
            <h2 className="text-lg font-semibold mb-4 text-blue-700">
              Bot Interaction
            </h2>
            <MessageInput
              onMessageSent={handleUserMessage}
              isLoading={messageLoading}
            />
            {response && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg shadow-lg">
                <BotResponse response={response} onFeedback={handleFeedback} />
              </div>
            )}
            {loadingFeedback && (
              <p className="mt-4 text-sm text-gray-600">
                Submitting feedback...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
