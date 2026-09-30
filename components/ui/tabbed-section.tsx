"use client";

import { useState } from "react";

interface TabConfig {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedSectionProps {
  tabs: readonly TabConfig[];
  defaultTab?: string;
}

export function TabbedSection({ tabs, defaultTab }: TabbedSectionProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="rounded-xl border border-border bg-surface backdrop-blur-sm">
      <div className="flex flex-wrap gap-1 border-b border-border p-1" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-surface-accent text-foreground"
                : "text-text-secondary hover:bg-surface-soft hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="p-5"
      >
        {activeTabConfig?.content}
      </div>
    </div>
  );
}
