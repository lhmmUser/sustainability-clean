// components/ChatCard.tsx

import Link from "next/link";
import { useState, useEffect } from "react";
import { fetchData } from "@/utils/api_dashboard";

// Define types for chat data structure
type Chat = {
  message_id: string; // Unique identifier for each message
  name: string;
  text: string;
  time: string; // Formatted timestamp of the message
};

interface ChatCardProps {
  timeRange?: string;
}

const ChatCard: React.FC<ChatCardProps> = ({ timeRange = "7" }) => {
  const [chatData, setChatData] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(); // Adjust formatting as needed
  };

  // Fetch chat messages and user info
  useEffect(() => {
    const fetchChatData = async () => {
      setLoading(true);
      try {
        // Fetch messages from the API (Messages API)
        const messagesData = await fetchData("/messages");

        if (messagesData.success) {
          const messages = messagesData.data;

          // Fetch user info from the Users API
          const userInfoData = await fetchData("/users");

          if (userInfoData.success) {
            // Create a map of user_id to user name
            const userMap: { [key: string]: string } = userInfoData.data.reduce(
              (acc: { [key: string]: string }, user: any) => {
                acc[user.user_id] = user.name;
                return acc;
              },
              {},
            );

            // Extract all messages into a single array
            const allMessages: any[] = messages.flatMap((user: any) =>
              user.messages.map((message: any) => ({
                message_id: message.message_id,
                user_id: user.user_id,
                text: message.user_question,
                time: message.timestamp,
              })),
            );

            // Filter messages based on timeRange
            const filteredMessages = filterMessagesByTimeRange(allMessages, timeRange);

            // Sort messages by timestamp in descending order
            filteredMessages.sort(
              (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
            );

            // Take the top 5 recent messages
            const recentMessages = filteredMessages.slice(0, 5);

            // Map messages with user details
            const mappedChatData: Chat[] = recentMessages.map((msg) => ({
              message_id: msg.message_id,
              name: userMap[msg.user_id] || "Unknown",
              text: msg.text,
              time: formatTimestamp(msg.time),
            }));

            setChatData(mappedChatData);
          } else {
            throw new Error("Failed to fetch user information.");
          }
        } else {
          throw new Error("Failed to fetch messages.");
        }
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();
  }, [timeRange]);

  const filterMessagesByTimeRange = (messages: any[], range: string) => {
    if (range === "all") {
      return messages;
    }

    const currentDate = new Date();
    const filterDays = parseInt(range);
    const filterDate = new Date();
    filterDate.setDate(currentDate.getDate() - filterDays);

    return messages.filter((message) => {
      const messageDate = new Date(message.time);
      return messageDate >= filterDate;
    });
  };

  if (loading) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
        <h4 className="mb-6 px-7.5 text-xl font-semibold text-black dark:text-white">
          Chats
        </h4>
        <p className="px-7.5">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-12 rounded-sm border border-stroke bg-white py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
        <h4 className="mb-6 px-7.5 text-xl font-semibold text-black dark:text-white">
          Chats
        </h4>
        <p className="px-7.5 text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <h4 className="mb-6 px-7.5 text-xl font-semibold text-black dark:text-white">
        Chats
      </h4>

      <div>
        {chatData.length === 0 ? (
          <p className="px-7.5 text-gray-500">No recent chats available for this time range.</p>
        ) : (
          chatData.map((chat) => (
            <Link
              href={`/chat/${chat.message_id}`} // Assuming you have a detailed chat page
              className="flex items-center gap-5 px-7.5 py-3 hover:bg-gray-3 dark:hover:bg-meta-4"
              key={chat.message_id}
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gray-200">
                {/* You can place a user avatar or initials here */}
                <span className="text-lg font-semibold text-gray-700">
                  {chat.name.charAt(0)}
                </span>
              </div>

              <div className="flex flex-1 items-center justify-between">
                <div>
                  <h5 className="font-medium text-black dark:text-white">
                    {chat.name}
                  </h5>
                  <p>
                    <span className="text-sm text-black dark:text-white">
                      {chat.text}
                    </span>
                    <span className="text-xs text-gray-500">
                      {" "}
                      • {chat.time}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatCard;