"use client";
import React, { useState, ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

interface ChildProps {
  showAverages?: boolean;
  timeRange?: string;
}

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAverages, setShowAverages] = useState(true);
  const [timeRange, setTimeRange] = useState("7"); // Default to 7 days

  // Clone children with props
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        showAverages,
        timeRange,
      } as ChildProps);
    }
    return child;
  });

  return (
    <div className="flex">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="relative flex flex-1 flex-col lg:ml-72.5">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          showAverages={showAverages}
          setShowAverages={setShowAverages}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
        />

        <main>
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            {childrenWithProps}
          </div>
        </main>
      </div>
    </div>
  );
}