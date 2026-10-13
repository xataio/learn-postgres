"use client";

import { useEffect, useRef } from "react";
import { capture } from "@/lib/analytics";

type Props = {
  lessonSlug: string;
  moduleOrder: number;
  isSignedIn: boolean;
  checksTotal: number;
  checksPassed: number;
};

export const LessonViewTracker = ({
  lessonSlug,
  moduleOrder,
  isSignedIn,
  checksTotal,
  checksPassed,
}: Props) => {
  const trackedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (trackedSlug.current === lessonSlug) return;
    trackedSlug.current = lessonSlug;
    capture("lesson_viewed", {
      lesson_slug: lessonSlug,
      module_order: moduleOrder,
      signed_in: isSignedIn,
      checks_total: checksTotal,
      checks_passed: checksPassed,
    });
  }, [lessonSlug, moduleOrder, isSignedIn, checksTotal, checksPassed]);

  return null;
};
