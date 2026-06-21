import { redirect } from "next/navigation";

// The professional dashboard is now the unified portal's Leads inbox.
export default function ProfessionalDashboardRedirect() {
  redirect("/professional");
}
