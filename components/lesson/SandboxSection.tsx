import {
  ensureBranchForLesson,
  type UserBranchRow,
} from "@/lib/branch-manager";
import type { Lesson } from "@/lib/lessons";
import { BranchPanel } from "./BranchPanel";
import { SandboxPanel } from "./SandboxPanel";

/**
 * Server component that does the slow Xata work for a lesson sandbox. Rendered
 * inside a <Suspense> boundary so the prose can stream first. We catch the
 * error here (instead of bubbling to a route-level error boundary) so that
 * the rest of the lesson stays readable when Xata is unhappy.
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

  let row: UserBranchRow;
  try {
    row = await ensureBranchForLesson(userId, lesson);
  } catch (err) {
    return <BranchPanel kind="error" message={(err as Error).message} />;
  }
  return (
    <SandboxPanel
      lessonSlug={lesson.meta.slug}
      branchName={row.xataBranchName}
    />
  );
}
