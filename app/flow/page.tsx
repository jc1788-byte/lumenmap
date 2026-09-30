// Flow page route
"use client";

import { FlowSection } from "@/components/dashboard/FlowSection";
import { SectionNav } from "@/components/dashboard/SectionNav";

export default function FlowPage() {
  return (
    <>
      <SectionNav />
      <FlowSection />
    </>
  );
}
