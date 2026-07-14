import FleetPortal from "./portal";
import { getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <FleetPortal userName={user?.displayName ?? "Operations Team"} />;
}
