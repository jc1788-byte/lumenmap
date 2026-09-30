import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { flowViewIsEnabled } from "@/lib/flow-feature-flag";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const flowViewEnabled = flowViewIsEnabled(params.flow);

  return <DashboardPage flowViewEnabled={flowViewEnabled} />;
}
