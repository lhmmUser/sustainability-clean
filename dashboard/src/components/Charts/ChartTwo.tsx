"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ApexOptions } from "apexcharts";
import { fetchData } from "@/utils/api_dashboard"; // Ensure the path is correct for your utility function

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface ChartTwoProps {
  timeRange?: string;
}

const ChartTwo: React.FC<ChartTwoProps> = ({ timeRange = "7" }) => {
  const [series, setSeries] = useState<{ name: string; data: number[] }[]>([
    { name: "Messages", data: [] }
  ]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const data = await fetchData("/messages"); // Replace with your actual API endpoint
      const messages = data.data;

      // Process data based on the selected time range
      const processedData = processMessages(messages, timeRange);
      setCategories(processedData.categories);
      setSeries([
        {
          name: "Messages",
          data: processedData.messageCounts,
        },
      ]);
    } catch (error) {
      console.error("Error fetching messages data:", error);
      // Set empty data on error
      setCategories([]);
      setSeries([{ name: "Messages", data: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const processMessages = (messages: any[], range: string) => {
    const messageCounts: number[] = [];
    let categories: string[] = [];
    const groupedData: { [key: string]: number } = {};

    // Get current date for filtering
    const currentDate = new Date();
    const filterDays = range === "all" ? 0 : parseInt(range);
    const filterDate = new Date();
    if (filterDays > 0) {
      filterDate.setDate(currentDate.getDate() - filterDays);
    }

    // Loop through each user and their messages
    messages.forEach((user) => {
      if (!user || !user.messages) return; // Skip if user or messages is undefined
      
      user.messages.forEach((message: any) => {
        if (!message || !message.timestamp) return; // Skip invalid messages
        
        const messageDate = new Date(message.timestamp);
        
        // Skip if message is outside the selected time range
        if (filterDays > 0 && messageDate < filterDate) {
          return;
        }
        
        let key = "";
        
        // Determine grouping based on time range
        if (range === "7") {
          // For 7 days, group by day
          key = messageDate.toISOString().split("T")[0];
        } else if (range === "30") {
          // For 30 days, group by day
          key = messageDate.toISOString().split("T")[0];
        } else if (range === "90") {
          // For 90 days, group by week
          key = `${messageDate.getFullYear()}-W${getWeekNumber(messageDate)}`;
        } else {
          // For all time, group by month
          key = `${messageDate.getFullYear()}-${String(messageDate.getMonth() + 1).padStart(2, "0")}`;
        }

        // Increment the message count for the time group
        if (!groupedData[key]) {
          groupedData[key] = 0;
        }
        groupedData[key] += 1;
      });
    });

    // Populate categories and message counts in ascending order
    Object.entries(groupedData)
    .sort(([keyA], [keyB]) => {
      if (range === "90") {
        // Handle week-based sorting
        const [yearA, weekA] = keyA.split('-W').map(Number);
        const [yearB, weekB] = keyB.split('-W').map(Number);
        if (yearA === yearB) return weekA - weekB;
        return yearA - yearB;
      } else {
        // Handle date-based sorting for other ranges
        return new Date(keyA).getTime() - new Date(keyB).getTime();
      }
    })
      .forEach(([key, count]) => {
        categories.push(key);
        messageCounts.push(count);
      });

    return { categories, messageCounts };
  };

  const getWeekNumber = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor(
      (date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.ceil((days + firstDay.getDay() + 1) / 7);
  };

  const options: ApexOptions = {
    chart: {
      type: "area",
      height: 335,
      toolbar: { show: false },
      animations: {
        enabled: true
      }
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#3C50E0"],
    stroke: {
      curve: "smooth",
      width: 2,
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 4,
      colors: ["#3C50E0"],
      strokeColors: "#fff",
      strokeWidth: 2,
    },
    xaxis: {
      categories: categories,
      title: {
        text: "Time",
        style: {
          fontWeight: "bold",
        },
      },
      labels: {
        rotate: -45,
        rotateAlways: false,
        style: {
          fontSize: '10px'
        }
      }
    },
    yaxis: {
      title: {
        text: "Number of Messages",
        style: {
          fontWeight: "bold",
        },
      },
      min: 0
    },
    tooltip: {
      enabled: true,
      shared: true,
      y: {
        formatter: function (value) {
          return `${value} messages`;
        },
      },
    },
    grid: {
      borderColor: "#e7e7e7",
      strokeDashArray: 5,
    },
    noData: {
      text: "No data available for this time range",
      align: "center",
      verticalAlign: "middle",
      offsetX: 0,
      offsetY: 0,
      style: {
        color: "#6c757d",
        fontSize: "14px",
        fontFamily: "Satoshi, sans-serif"
      }
    }
  };

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pb-6 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-8">
      <div className="mb-3 flex items-center justify-between sm:flex-row">
        <div>
          <h5 className="text-xl font-semibold text-black dark:text-white">
            Messages Per Time Range
          </h5>
        </div>
      </div>

      <div id="chartMessagesPerDay" className="-ml-5">
        {loading ? (
          <p className="items-center justify-center text-center py-10">
            Loading Messages Data...
          </p>
        ) : categories.length > 0 ? (
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={350}
            width={"100%"}
          />
        ) : (
          <p className="items-center justify-center text-center py-10">
            No data available for this time range
          </p>
        )}
      </div>
    </div>
  );
};

export default ChartTwo;