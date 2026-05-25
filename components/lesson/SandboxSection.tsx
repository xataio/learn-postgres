import { getReadyBranch } from "@/lib/branch-manager";
import type { Lesson } from "@/lib/lessons";
import { BranchPanel } from "./BranchPanel";
import { SandboxBootstrap } from "./SandboxBootstrap";
import { SandboxPanel } from "./SandboxPanel";

/**
 * Server component for a lesson sandbox. It only does the *fast* work — check
 * whether a ready branch already exists — so it can stream in quickly behind
 * its <Suspense> boundary. If a branch is ready, the interactive panel renders
 * immediately. Otherwise it hands off to the client bootstrapper, which drives
 * the streaming /prepare endpoint and shows the branching/seeding stages live.
 */
export async function SandboxSection({
  userId,
  lesson,
}: {
  userId: string;
  lesson: Lesson;
}) {
  if (
    !process.env.XATA_API_KEY ||
    !process.env.XATA_ORG_ID ||
    !process.env.XATA_PROJECT_ID
  ) {
    return <BranchPanel kind="unconfigured" />;
  }

  let ready;
  try {
    ready = await getReadyBranch(userId, lesson.meta.slug);
  } catch (err) {
    return <BranchPanel kind="error" message={(err as Error).message} />;
  }

  if (ready) {
    return (
      <SandboxPanel
        lessonSlug={lesson.meta.slug}
        branchName={ready.xataBranchName}
      />
    );
  }

  return <SandboxBootstrap lessonSlug={lesson.meta.slug} />;
}
