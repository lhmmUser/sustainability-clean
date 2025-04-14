"use client";

import { useState, useEffect } from "react";
import { fetchData } from "@/utils/api_dashboard";

interface Message {
  message_id: string;
  user_id: string;
  user_question: string;
  answer: string;
  user_feedback: number;
  latency: number;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_inr: number;
  timestamp: string;
}

interface TableOneProps {
  timeRange?: string;
}

const TableOne: React.FC<TableOneProps> = ({ timeRange = "7" }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const data = await fetchData("/messages");

        // Flatten the messages array and map user_id to each message
        const allMessages = data.data.flatMap((user: any) =>
          user.messages.map((message: any) => ({
            ...message,
            user_id: user.user_id, // Add user_id from the parent object to each message
            session_id: user.session_id, // Include session_id for grouping
          })),
        );

        // Filter messages based on timeRange
        const filteredMessages = filterMessagesByTimeRange(allMessages, timeRange);

        // Sort messages by timestamp descending to get the latest messages
        filteredMessages.sort(
          (a: Message, b: Message) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        const latestMessages = filteredMessages.slice(0, 50); // Get the latest 50 messages
        setMessages(latestMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 600000); // Poll every 10 minutes
    return () => clearInterval(interval);
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
      const messageDate = new Date(message.timestamp);
      return messageDate >= filterDate;
    });
  };

  const downloadCSV = () => {
    const csvHeader =
      "Message ID, User ID, Message, Response, Feedback, Latency,Total Tokens,Input Tokens,Output Tokens,Cost (INR), Timestamp\n";
    const csvRows = messages
      .map(
        (msg) =>
          `"${msg.message_id || ''}","${msg.user_id || ''}","${(msg.user_question || '').replace(/"/g, '""')}","${(msg.answer || '').replace(/"/g, '""')}","${ msg.user_feedback || 0}","${msg.latency?.toFixed(3) || 0}","${msg.total_tokens || 0}","${msg.prompt_tokens || 0}","${msg.completion_tokens || 0}","${msg.cost_inr?.toFixed(4) || 0}","${new Date(
            msg.timestamp,
          ).toLocaleString()}"`,
      )
      .join("\n");

    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `messages_${timeRange}_days.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="mb-6 flex items-center justify-between">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Recent Messages
        </h4>
        <button
          onClick={downloadCSV}
          className="hover:bg-primary-dark rounded bg-primary px-4 py-2 text-sm font-medium text-white shadow"
        >
          Download
        </button>
      </div>

      <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
        {loading ? (
          <p className="text-center py-10">Loading messages data...</p>
        ) : messages.length === 0 ? (
          <p className="text-center py-10">No messages available for this time range</p>
        ) : (
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Message ID
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  User ID
                </th>
                <th className="min-w-[200px] px-4 py-4 font-medium text-black dark:text-white">
                  Message
                </th>
                <th className="min-w-[700px] px-4 py-4 font-medium text-black dark:text-white">
                  Response
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Feedback
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Latency
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Total Tokens
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Input Tokens
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Output Tokens
                </th>
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                  Cost (INR)
                </th>
                <th className="min-w-[150px] px-4 py-4 font-medium text-black dark:text-white">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.message_id}>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">{msg.message_id}</p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">{msg.user_id}</p>
                  </td>

                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {msg.user_question}
                    </p>
                  </td>

                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white overflow-hidden text-ellipsis max-w-[700px]">
                      {msg.answer}
                    </p>
                  </td>

                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {msg.user_feedback || 0}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-blue-500 dark:text-white">
                      {msg.latency?.toFixed(3) || 0}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {msg.total_tokens || 0}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {msg.prompt_tokens || 0}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {msg.completion_tokens || 0}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-blue-500 dark:text-white">
                      ₹{msg.cost_inr?.toFixed(4) || "0.0000"}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TableOne;