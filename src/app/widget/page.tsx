import { redirect } from "next/navigation";

// Redirect legacy /widget link to /book
export default function WidgetPage() {
  redirect("/book");
}
