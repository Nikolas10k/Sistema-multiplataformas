import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatformStats } from "@/actions/platform";
import { prisma } from "@/lib/prisma";
import PlatformDashboard from "../../platform-admin/PlatformDashboard";

export default async function PlatformAdminPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("user_role")?.value;

  if (role !== "PLATFORM_ADMIN") {
    redirect("/admin");
  }

  const stats = await getPlatformStats();
  const plans = await prisma.plan.findMany({ where: { active: true } });

  return (
    <PlatformDashboard stats={stats} plans={plans} />
  );
}
