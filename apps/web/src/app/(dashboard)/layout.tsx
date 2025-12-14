import { DashboardLayout } from "@/components/layout";
import { SubscriptionProvider } from "@/contexts/subscription-context";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </SubscriptionProvider>
  );
}
