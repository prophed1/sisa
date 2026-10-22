import type { Metadata } from "next";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { BudgetPanel } from "@/components/dashboard/budget-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SourcesPanel } from "@/components/dashboard/sources-panel";
import { SpendingSpotlight } from "@/components/dashboard/spending-spotlight";
import { SummaryHero } from "@/components/dashboard/summary-hero";
import { TrendChart } from "@/components/dashboard/trend-chart";

export const metadata: Metadata = {
  title: "Dasbor — Sisa",
};

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div className="reveal">
        <PageHeader />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div
          className="reveal lg:col-span-8"
          style={{ animationDelay: "70ms" }}
        >
          <SummaryHero />
        </div>

        <div
          className="reveal lg:col-span-4"
          style={{ animationDelay: "110ms" }}
        >
          <SpendingSpotlight />
        </div>

        <div
          className="reveal lg:col-span-8"
          style={{ animationDelay: "150ms" }}
        >
          <TrendChart />
        </div>

        <div
          className="reveal lg:col-span-4"
          style={{ animationDelay: "190ms" }}
        >
          <CategoryDonut />
        </div>

        <div
          className="reveal lg:col-span-8"
          style={{ animationDelay: "230ms" }}
        >
          <RecentTransactions />
        </div>

        <div
          className="reveal flex flex-col gap-5 lg:col-span-4"
          style={{ animationDelay: "270ms" }}
        >
          <BudgetPanel />
          <SourcesPanel />
        </div>
      </div>
    </div>
  );
}
