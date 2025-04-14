import { ApexOptions } from "apexcharts";
import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { fetchData } from "@/utils/api_dashboard"; // Your utility function to fetch data

interface ChartState {
  series: number[];
  options: ApexOptions;
}

interface ChartThreeProps {
  timeRange?: string;
}

const ChartThree: React.FC<ChartThreeProps> = ({ timeRange = "7" }) => {
  const [chartData, setChartData] = useState<ChartState>({
    series: [0, 0, 0], // Default data for Positive, Negative, and No Feedback
    options: {
      chart: {
        fontFamily: "Satoshi, sans-serif",
        type: "donut",
      },
      colors: ["#3C50E0", "#7EA2B2", "#8FD0EF"], // Blue, light blue, grey
      labels: ["Positive Feedback", "Negative Feedback", "No Feedback"],
      legend: {
        show: false,
        position: "bottom",
      },
      plotOptions: {
        pie: {
          donut: {
            size: "65%",
            background: "transparent",
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      responsive: [
        {
          breakpoint: 2600,
          options: {
            chart: {
              width: 380,
            },
          },
        },
        {
          breakpoint: 640,
          options: {
            chart: {
              width: 200,
            },
          },
        },
      ],
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
    },
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch feedback data and update chart
  useEffect(() => {
    const fetchFeedbackData = async () => {
      setLoading(true);
      try {
        const data = await fetchData("/messages"); // Adjust endpoint if needed
        const messages = data.data;

        // Initialize feedback counters
        let positiveFeedback = 0;
        let negativeFeedback = 0;
        let noFeedback = 0;

        // Get current date for filtering
        const currentDate = new Date();
        const filterDays = timeRange === "all" ? 0 : parseInt(timeRange);
        const filterDate = new Date();
        if (filterDays > 0) {
          filterDate.setDate(currentDate.getDate() - filterDays);
        }

        // Process messages and count feedback
        messages.forEach((user: any) => {
          user.messages.forEach((message: any) => {
            const messageDate = new Date(message.timestamp);
            
            // Skip if message is outside the selected time range
            if (filterDays > 0 && messageDate < filterDate) {
              return;
            }
            
            if (message.user_feedback === 1) {
              positiveFeedback++;
            } else if (message.user_feedback === -1) {
              negativeFeedback++;
            } else {
              noFeedback++;
            }
          });
        });

        // Set chart data
        setChartData({
          series: [positiveFeedback, negativeFeedback, noFeedback],
          options: {
            ...chartData.options,
            labels: [
              `Positive Feedback (${positiveFeedback})`,
              `Negative Feedback (${negativeFeedback})`,
              `No Feedback (${noFeedback})`,
            ],
          },
        });
      } catch (error) {
        console.error("Error fetching feedback data:", error);
        // Set empty data on error
        setChartData({
          series: [0, 0, 0],
          options: {
            ...chartData.options,
            labels: [
              "Positive Feedback (0)",
              "Negative Feedback (0)",
              "No Feedback (0)",
            ],
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFeedbackData();
    const interval = setInterval(fetchFeedbackData, 600000); // Poll every 10 minutes
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-5 pb-5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-5">
      <div className="mb-3 justify-between gap-4 sm:flex">
        <div>
          <h5 className="text-xl font-semibold text-black dark:text-white">
            Feedback Analytics
          </h5>
        </div>
      </div>

      <div className="mb-2">
        <div id="feedbackChart" className="mx-auto flex justify-center">
          {loading ? (
            <p className="items-center justify-center text-center py-10">
              Loading Feedback Data...
            </p>
          ) : (chartData.series[0] === 0 && chartData.series[1] === 0 && chartData.series[2] === 0) ? (
            <p className="items-center justify-center text-center py-10">
              No feedback data available for this time range
            </p>
          ) : (
            <ReactApexChart
              options={chartData.options}
              series={chartData.series}
              type="donut"
            />
          )}
        </div>
      </div>

      <div className="-mx-8 flex flex-wrap items-center justify-center gap-y-3">
        <div className="w-full px-8 sm:w-1/2">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#3C50E0]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> Positive </span>
              <span> {chartData.series[0] || 0} </span>
            </p>
          </div>
        </div>
        <div className="w-full px-8 sm:w-1/2">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#7EA2B2]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> Negative </span>
              <span> {chartData.series[1] || 0} </span>
            </p>
          </div>
        </div>
        <div className="w-full px-8 sm:w-1/2">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#8FD0EF]"></span>
            <p className="flex w-full justify-between text-sm font-medium text-black dark:text-white">
              <span> No Feedback </span>
              <span> {chartData.series[2] || 0} </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartThree;