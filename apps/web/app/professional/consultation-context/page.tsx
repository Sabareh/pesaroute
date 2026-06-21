import { redirect } from "next/navigation";

// Consultation context now lives in the unified portal's Scoped context view.
export default function ConsultationContextRedirect() {
  redirect("/professional/scoped-context");
}
