import { RouteLoading } from "@/components/motion/route-loading";

export default function Loading() {
  return (
    <RouteLoading
      title="Loading workspace"
      subtitle="Fetching dashboards, transactions, and inventory details..."
    />
  );
}
