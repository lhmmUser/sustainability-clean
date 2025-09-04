import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendMessage, type Message } from "@/utils/api";
import Image from "next/image";

const quickQuestions = [
  "What does the 3R's mean?",
  "If you had a magic power to help the Earth, what would it be?",
  "Can you think of a way to reuse an old toy or a cardboard box? ",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I assist you today?",
      role: "assistant",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionID, setSessionID] = useState<string>(""); // Session ID for frontend
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Existing useEffect and handler functions remain the same
  useEffect(() => {
    setSessionID(Math.random().toString(36).substr(2, 9));
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return; // Avoid sending empty messages

    setIsLoading(true);
    setInput("");

    // Add user message to the chat
    const userMessage:Message = {
      id: Date.now().toString(),
      content: message,
      role: "user",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create an empty assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage :Message = {
      id: assistantMessageId,
      content: "", // Start with empty content
      role: "assistant",
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, assistantMessage]);
    
    // Track the assistant's response
    let assistantContent = "";

    try {
      // Send the user's message and update assistant's content in chunks
      await sendMessage(message, (chunk) => {
        assistantContent += chunk; // Append chunks to the assistant content
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantContent } // Update the assistant message
              : msg
          )
        );
        
      });
    } catch (error) {
      console.error("Error sending message:", error);

      // Update the assistant message to indicate an error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: "Sorry, something went wrong. Please try again.",
              }
            : msg
        )
      );
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen h-screen overflow-hidden flex items-center justify-center">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <Image
          src="hills_bg.jpg"
          alt="Background"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#1a2b4b]/50 backdrop-blur-sm" />
      </div>

      {/* Main Chat Container */}
      <div className="w-full max-w-4xl mx-auto px-4 py-8 z-10">
        <Card className="h-[calc(100vh-4rem)] bg-gray-900/40 backdrop-blur-xl border-gray-700/30 rounded-2xl overflow-hidden">
          {/* Messages Container */}
          <div
            className="flex-1 h-[calc(100%-180px)] overflow-y-auto p-4 space-y-4 scrollbar-hide"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": {
                display: "none",
              },
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start gap-2.5 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-white"
                    }`}
                  >
                    {/* Render Markdown for assistant messages */}
                    {message.role === "assistant" ? (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4 bg-gray-900/40 backdrop-blur-sm text-black">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="relative"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={isLoading}
                className="w-full bg-white border-transparent pr-12 rounded-xl"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-transparent hover:bg-transparent"
              >
                <Send className="w-5 h-5 text-gray-500" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2 justify-center pb-2">
              {quickQuestions.map((question) => (
                <Button
                  key={question}
                  variant="secondary"
                  onClick={() => handleSend(question)}
                  disabled={isLoading}
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white border-0 rounded-full text-sm px-4 py-2"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
