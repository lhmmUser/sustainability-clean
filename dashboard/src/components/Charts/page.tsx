"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import ChartOne from "@/components/Charts/ChartOne";
import dynamic from "next/dynamic";
import React from "react";

const ChartThree = dynamic(() => import("@/components/Charts/ChartThree"), {
  ssr: false,
});

const Chart: React.FC = () => {
  return (
    <>
      <Breadcrumb pageName="Chart" />

      <div className="grid grid-cols-1 gap-4 md:gap-6 2xl:gap-7.5">
        {/* Chart One - Full width on mobile, 2/3 on larger screens */}
        <div className="w-full md:col-span-2 lg:col-span-8">
          <div className="h-full">
            <ChartOne />
          </div>
        </div>

        {/* Chart Three - Full width on mobile, 1/3 on larger screens */}
        <div className="w-full md:col-span-1 lg:col-span-4">
          <div className="h-full">
            <ChartThree />
          </div>
        </div>
      </div>
    </>
  );
};

export default Chart;
