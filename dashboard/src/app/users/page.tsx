import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import TableTwo from "@/components/Tables/TableTwo";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export const metadata: Metadata = {
  title: "Sustainability | Users",
  description: "User profiles table for HappyTummy dashboard",
};

const TablesPage = () => {
  return (
    <DefaultLayout>
      {/* 12-column grid */}
      <Breadcrumb pageName="Persona" />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12 xl:gap-6 2xl:gap-7.5">
        {/* Table row also takes full width */}
        <div className="lg:col-span-12">
          <TableTwo />
        </div>
      </div>
    </DefaultLayout>
  );
};

export default TablesPage;
