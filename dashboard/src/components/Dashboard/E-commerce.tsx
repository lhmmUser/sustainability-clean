"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import ChartOne from "../Charts/ChartOne";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faRupeeSign,
  faArrowUpFromBracket,
  faHexagonNodes,
  faLaptopCode,
} from "@fortawesome/free-solid-svg-icons";

import { faMessage } from "@fortawesome/free-regular-svg-icons";
import { faConnectdevelop } from "@fortawesome/free-brands-svg-icons";
import ChartTwo from "../Charts/ChartTwo";
import ChatCard from "../Chat/ChatCard";
import TableOne from "../Tables/TableOne";
import CardDataStats from "../CardDataStats";
import { fetchData } from "@/utils/api_dashboard";

const ChartThree = dynamic(() => import("@/components/Charts/ChartThree"), {
  ssr: false,
});

interface ECommerceProps {
  showAverages: boolean;
  timeRange?: string;
}

const ECommerce: React.FC<ECommerceProps> = ({ showAverages, timeRange = "7" }) => {
  const [analyticsData, setAnalyticsData] = useState({
    total_messages: 0,
    total_users: 0,
    total_sessions: 0,
    avg_latency: 0,
    avg_total_tokens: 0,
    avg_input_tokens: 0,
    avg_output_tokens: 0,
    avg_cost_per_message: 0,
    total_tokens_used: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    positive_feedback: 0,
    negative_feedback: 0,
    no_feedback: 0,
    avg_sessions_per_user: 0,
    avg_messages_per_user: 0,
    avg_messages_per_session: 0,
    total_cost: 0,
  });
  
  const [filteredData, setFilteredData] = useState({
    total_messages: 0,
    total_users: 0,
    total_sessions: 0,
    avg_latency: 0,
    avg_total_tokens: 0,
    avg_input_tokens: 0,
    avg_output_tokens: 0,
    avg_cost_per_message: 0,
    total_tokens_used: 0,
    total_input_tokens: 0,
    total_output_tokens: 0,
    positive_feedback: 0,
    negative_feedback: 0,
    no_feedback: 0,
    avg_sessions_per_user: 0,
    avg_messages_per_user: 0,
    avg_messages_per_session: 0,
    total_cost: 0,
  });

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const response = await fetchData("/analytics");
        if (response.success) {
          setAnalyticsData(response.data);
          
          // Also fetch messages to calculate time-filtered metrics
          const messagesResponse = await fetchData("/messages");
          if (messagesResponse.success) {
            calculateFilteredMetrics(messagesResponse.data, response.data, timeRange);
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      }
    };

    fetchAnalyticsData();
    const interval = setInterval(fetchAnalyticsData, 600000);
    return () => clearInterval(interval);
  }, [timeRange]);
  
  const calculateFilteredMetrics = (messages: any[], analytics: any, range: string) => {
    // Initialize counters
    let totalMessages = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let positiveFeedback = 0;
    let negativeFeedback = 0;
    let noFeedback = 0;
    
    // Get current date for filtering
    const currentDate = new Date();
    const filterDays = range === "all" ? 0 : parseInt(range);
    const filterDate = new Date();
    if (filterDays > 0) {
      filterDate.setDate(currentDate.getDate() - filterDays);
    }
    
    // Process messages
    messages.forEach((user: any) => {
      user.messages.forEach((message: any) => {
        const messageDate = new Date(message.timestamp);
        
        // Skip if message is outside the selected time range
        if (filterDays > 0 && messageDate < filterDate) {
          return;
        }
        
        // Count this message
        totalMessages++;
        
        // Add tokens
        totalInputTokens += message.prompt_tokens || 0;
        totalOutputTokens += message.completion_tokens || 0;
        totalTokens += message.total_tokens || 0;
        
        // Add cost
        totalCost += message.cost_inr || 0;
        
        // Add latency
        totalLatency += message.latency || 0;
        
        // Count feedback
        if (message.user_feedback === 1) {
          positiveFeedback++;
        } else if (message.user_feedback === -1) {
          negativeFeedback++;
        } else {
          noFeedback++;
        }
      });
    });
    
    // Calculate averages
    const avgInputTokens = totalMessages > 0 ? totalInputTokens / totalMessages : 0;
    const avgOutputTokens = totalMessages > 0 ? totalOutputTokens / totalMessages : 0;
    const avgTotalTokens = totalMessages > 0 ? totalTokens / totalMessages : 0;
    const avgCostPerMessage = totalMessages > 0 ? totalCost / totalMessages : 0;
    const avgLatency = totalMessages > 0 ? totalLatency / totalMessages : 0;
    
    // Set filtered data
    setFilteredData({
      ...analytics,
      total_messages: totalMessages,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tokens_used: totalTokens,
      total_cost: totalCost,
      avg_input_tokens: avgInputTokens,
      avg_output_tokens: avgOutputTokens,
      avg_total_tokens: avgTotalTokens,
      avg_cost_per_message: avgCostPerMessage,
      avg_latency: avgLatency,
      positive_feedback: positiveFeedback,
      negative_feedback: negativeFeedback,
      no_feedback: noFeedback
    });
  };

    // Define metrics
    const averageMetrics = [
      {
        title: "Avg Input Tokens",
        total: filteredData.avg_input_tokens.toFixed(2) || "0.00",
        icon: faHexagonNodes,
      },
      {
        title: "Avg Output Tokens",
        total: filteredData.avg_output_tokens.toFixed(2) || "0.00",
        icon: faArrowUpFromBracket,
      },
      {
        title: "Avg Tokens/Msg",
        total: filteredData.avg_total_tokens.toFixed(2) || "0.00",
        icon: faConnectdevelop,
      },
      {
        title: "Avg Cost/Msg",
        total: `₹${filteredData.avg_cost_per_message.toFixed(4) || "0.0000"}`,
        icon: faCoins,
      },
      {
        title: "Sessions/User",
        total: filteredData.avg_sessions_per_user.toFixed(2) || "0.00",
        icon: faLaptopCode,
      },
      {
        title: "Messages/User",
        total: filteredData.avg_messages_per_user.toFixed(2) || "0.00",
        icon: faMessage,
      },
    ];

  const totalMetrics = [
    {
      title: "Input Tokens",
      total: filteredData.total_input_tokens.toLocaleString() || "0",
      icon: faHexagonNodes,
    },
    {
      title: "Output Tokens",
      total: filteredData.total_output_tokens.toLocaleString() || "0",
      icon: faArrowUpFromBracket,
    },
    {
      title: "Total Tokens",
      total: filteredData.total_tokens_used.toLocaleString() || "0",
      icon: faConnectdevelop,
    },
    {
      title: "Total Cost",
      total: `₹${filteredData.total_cost.toFixed(4) || "0.0000"}`,
      icon: faRupeeSign,
    },
    {
      title: "Total Sessions",
      total: filteredData.total_sessions.toLocaleString() || "0",
      icon: faLaptopCode,
    },
    {
      title: "Total Messages",
      total: filteredData.total_messages.toLocaleString() || "0",
      icon: faMessage,
    },
  ];

  const currentMetrics = showAverages ? averageMetrics : totalMetrics;


  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6 2xl:gap-7.5">
        {currentMetrics.map((metric, index) => (
          <CardDataStats
            key={index}
            title={metric.title}
            total={metric.total}
            levelUp
          >
            <div
              className="flex items-center justify-center rounded-lg p-3"
              style={{
                backgroundColor: "#f0f9ff",
                border: "1px solid #ccc",
              }}
            >
              <FontAwesomeIcon
                icon={metric.icon}
                className="text-sm"
                style={{
                  color: "#1D4ED8", // Custom color for the icon
                }}
              />
            </div>
          </CardDataStats>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-6 2xl:gap-7.5">
        <div className="lg:col-span-8">
          <ChartOne timeRange={timeRange} />
        </div>
        <div className="lg:col-span-4">
          <ChartThree timeRange={timeRange} />
        </div>
        <div className="lg:col-span-12">
          <ChartTwo timeRange={timeRange} />
        </div>
        <div className="lg:col-span-8">
          <TableOne timeRange={timeRange} />
        </div>
        <div className="lg:col-span-4">
          <ChatCard timeRange={timeRange} />
        </div>
      </div>
    </>
  );
};

export default ECommerce;