"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-border bg-surface backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-soft"
        aria-expanded={isOpen}
      >
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={isOpen ? "Collapse section" : "Expand section"}
        >
          <ChevronRight
            className={`h-5 w-5 transition-transform ${isOpen ? "rotate-90" : ""}`}
          />
        </Button>
      </button>
      {isOpen && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}
