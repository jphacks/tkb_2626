import { redirect } from "next/navigation";
import { loadInvite } from "@/lib/invite";
import { DeclineForm } from "./DeclineForm";

export default async function DeclinePage(props: PageProps<"/e/[token]/decline">) {
  const { token } = await props.params;
  const { event, participation, ownerName } = await loadInvite(token, `/e/${token}/decline`);
  if (event.status === "CANCELED") redirect(`/e/${token}`);

  return <DeclineForm token={token} title={event.title} ownerName={ownerName} note={participation.attendance === "DECLINED" ? participation.note ?? "" : ""} />;
}
