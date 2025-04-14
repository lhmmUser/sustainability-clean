"use client";

import { useState, useEffect } from "react";
import { fetchData } from "@/utils/api_dashboard";
import CardDataStats from "@/components/CardDataStats";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faCoins } from "@fortawesome/free-solid-svg-icons";

interface Persona {
  user_id: string;
  name: string;
  age: number;
  gender: string;
  city: string;
  personality_info: string[] | null;
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost_inr: number;
  created_at: string;
  updated_at: string;
}

const TableTwo = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const data = await fetchData("/users");
        if (data.success && Array.isArray(data.data)) {
          const allPersonas: Persona[] = data.data;

          // Calculate total users
          setTotalUsers(allPersonas.length);

          // Calculate total cost, ensuring cost_inr is a number
          const calculatedTotalCost = allPersonas.reduce(
            (acc: number, user: Persona) => acc + (user.cost_inr || 0),
            0,
          );
          setTotalCost(parseFloat(calculatedTotalCost.toFixed(4)));

          // Sort by created_at DESC and get the latest 50
          const sortedPersonas = allPersonas
            .sort(
              (a: Persona, b: Persona) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )
            .slice(0, 50);
          setPersonas(sortedPersonas);
        } else {
          console.error("Unexpected API response structure:", data);
        }
      } catch (error) {
        console.error("Error fetching user profiles:", error);
      }
    };

    fetchPersonas();
    const interval = setInterval(fetchPersonas, 600000); // Poll every 10 minutes
    return () => clearInterval(interval);
  }, []);

  // Download CSV with all fields
  const downloadCSV = () => {
    const csvHeader =
      "User ID,Name,Age,Gender,City,Personality Info,Total Tokens,Input Tokens,Output Tokens,Cost (INR),Created At,Updated At\n";

    const csvRows = personas.map((persona) => {
      // Handle null or non-array personality_info
      const personality = Array.isArray(persona.personality_info)
        ? persona.personality_info.join("; ")
        : "No personality info available";

      return (
        `"${persona.user_id}",` +
        `"${persona.name}",` +
        `"${persona.age}",` +
        `"${persona.gender}",` +
        `"${persona.city}",` +
        `"${personality}",` +
        `"${persona.total_tokens}",` +
        `"${persona.prompt_tokens}",` +
        `"${persona.completion_tokens}",` +
        `"${persona.cost_inr.toFixed(4)}",` +
        `"${new Date(persona.created_at).toLocaleString()}",` +
        `"${new Date(persona.updated_at).toLocaleString()}"`
      );
    });

    const csvContent = csvHeader + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "user_profiles.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPersonas = personas.filter((persona) => {
    const lowerTerm = searchTerm.toLowerCase();

    return (
      persona.user_id.toLowerCase().includes(lowerTerm) ||
      persona.name.toLowerCase().includes(lowerTerm) ||
      (Array.isArray(persona.personality_info) &&
        persona.personality_info.some((info) =>
          info.toLowerCase().includes(lowerTerm),
        ))
    );
  });

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      {/* Cards Section */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Total Users Card */}
        <CardDataStats
          title="Total Users"
          total={totalUsers.toLocaleString()}
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
              icon={faUsers}
              className="text-2xl"
              style={{
                color: "#1D4ED8", // Custom color for the icon
              }}
            />
          </div>
        </CardDataStats>

        {/* Persona Calculation Cost Card */}
        <CardDataStats
          title="Persona Calculation Cost"
          total={`₹${totalCost.toFixed(3)}`}
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
              icon={faCoins}
              className="text-2xl"
              style={{
                color: "#1D4ED8", // Custom color for the icon
              }}
            />
          </div>
        </CardDataStats>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          User Profiles
        </h4>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-md border border-stroke px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-strokedark dark:bg-meta-4 dark:focus:border-primary"
          />
          <button
            onClick={downloadCSV}
            className="hover:bg-primary-dark rounded bg-primary px-4 py-2 text-sm font-medium text-white shadow"
          >
            Download
          </button>
        </div>
      </div>

      <div className="max-h-[600px] overflow-x-auto overflow-y-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                User ID
              </th>
              <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                Name
              </th>
              <th className="min-w-[50px] px-4 py-4 font-medium text-black dark:text-white">
                Age
              </th>
              <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                Gender
              </th>
              <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                City
              </th>
              <th className="min-w-[200px] px-4 py-4 font-medium text-black dark:text-white">
                Personality Info
              </th>
              <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                Total Tokens
              </th>
              <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">
                Input Tokens
              </th>
              <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">
                Output Tokens
              </th>
              <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">
                Cost (INR)
              </th>
              <th className="min-w-[150px] px-4 py-4 font-medium text-black dark:text-white">
                Created At
              </th>
              <th className="min-w-[150px] px-4 py-4 font-medium text-black dark:text-white">
                Updated At
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPersonas.map((persona) => (
              <tr key={persona.user_id}>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {persona.user_id}
                  </p>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">{persona.name}</p>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">{persona.age}</p>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">{persona.gender}</p>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">{persona.city}</p>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <ul className="list-inside list-disc">
                  {Array.isArray(persona.personality_info) &&
                    persona.personality_info.length > 0 ? (
                      persona.personality_info.map((info, index) => (
                        <li key={index} className="text-black dark:text-white">
                          {info}
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500 dark:text-gray-400">
                        No personality info available.
                      </li>
                    )}
                  </ul>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {persona.total_tokens}
                  </p>
                </td>
                {/* Input Tokens */}
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {persona.prompt_tokens}
                  </p>
                </td>
                {/* Output Tokens */}
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {persona.completion_tokens}
                  </p>
                </td>
                {/* Cost */}
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-blue-500">
                    ₹{persona.cost_inr?.toFixed(3)}
                  </p>
                </td>
                {/* Created At */}
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {new Date(persona.created_at).toLocaleString()}
                  </p>
                </td>
                {/* Updated At */}
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {new Date(persona.updated_at).toLocaleString()}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableTwo;
