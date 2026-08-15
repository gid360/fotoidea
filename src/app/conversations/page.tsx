import { ConversationsClient } from "./ConversationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Сообщения | Fotoidea CRM",
};

export default function ConversationsPage() {
  return <ConversationsClient />;
}
