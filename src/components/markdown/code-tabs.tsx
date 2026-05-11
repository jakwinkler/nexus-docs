"use client";

import { useState, type ReactNode, type ReactElement, Children } from "react";
import { cn } from "@/lib/utils";

interface CodeTabsProps {
  children: ReactNode;
  labels?: string[];
}

export function CodeTabs({ children, labels }: CodeTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = Children.toArray(children) as Array<ReactElement & { props?: Record<string, unknown> }>;

  // Try to extract language labels from children if not provided
  const tabLabels =
    labels ||
    tabs.map((tab, i) => {
      // Try to get the language from the code block's className
      const inner = tab?.props?.children as ReactElement & { props?: Record<string, unknown> } | undefined;
      if (inner?.props?.className) {
        const match = String(inner.props.className).match(
          /language-(\w+)/
        );
        if (match) return match[1].toUpperCase();
      }
      // Try data-label attribute
      if (tab?.props?.["data-label"]) {
        return tab.props["data-label"] as string;
      }
      return `Tab ${i + 1}`;
    });

  return (
    <div className="my-4 not-prose">
      {/* Tab header */}
      <div className="flex border-b border-white/10 bg-slate-800 rounded-t-lg dark:bg-slate-900">
        {tabLabels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={cn(
              "px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
              activeTab === i
                ? "border-brand-400 text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="[&_>_*]:!mt-0 [&_>_*]:!rounded-t-none [&_.group]:!mt-0 [&_.group_>_div:first-child]:hidden">
        {tabs.map((tab, i) => (
          <div
            key={i}
            className={activeTab === i ? "block" : "hidden"}
            role="tabpanel"
          >
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
}
