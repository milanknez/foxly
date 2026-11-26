import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import LandingPageClient from "@/components/landing-page-client";

export default async function HomePage() {
  const session = await getSession();

  // Pro nepřihlášené návštěvníky zobrazíme moderní Landing Page
  if (!session) {
    return <LandingPageClient />;
  }

  // Pro přihlášené uživatele přesměrujeme do jejich firemního workspace
  const membership = await db.workspaceMember.findFirst({
    where: { userId: session.id },
    include: { workspace: true },
  });

  if (membership?.workspace) {
    redirect(`/${membership.workspace.slug}`);
  }

  const firstWorkspace = await db.workspace.findFirst();
  if (firstWorkspace) {
    redirect(`/${firstWorkspace.slug}`);
  }

  return <LandingPageClient />;
}
