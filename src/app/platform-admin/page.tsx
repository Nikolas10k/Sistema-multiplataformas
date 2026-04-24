import { redirect } from "next/navigation";

export default function PlatformAdminRedirect() {
  redirect("/admin/clientes");
}
