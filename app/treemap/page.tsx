// Treemap page route
"use client";

import { TreemapSection } from "@/components/dashboard/TreemapSection";
import { SectionNav } from "@/components/dashboard/SectionNav";

export default function TreemapPage() {
  return (
    <>
      <SectionNav />
      <TreemapSection />
    </>
  );
}
