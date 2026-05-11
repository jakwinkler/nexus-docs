import { AlertCircle, Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

type AdmonitionType = "note" | "tip" | "info" | "warning" | "danger" | "success";

interface AdmonitionProps {
  type?: AdmonitionType;
  title?: string;
  children: React.ReactNode;
}

const config: Record<
  AdmonitionType,
  { icon: React.ElementType; className: string; defaultTitle: string }
> = {
  note: {
    icon: Info,
    className: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",
    defaultTitle: "Note",
  },
  tip: {
    icon: Lightbulb,
    className: "border-green-400 bg-green-50 dark:bg-green-950/30",
    defaultTitle: "Tip",
  },
  info: {
    icon: Info,
    className: "border-sky-400 bg-sky-50 dark:bg-sky-950/30",
    defaultTitle: "Info",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
    defaultTitle: "Warning",
  },
  success: {
    icon: CheckCircle,
    className: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    defaultTitle: "Success",
  },
  danger: {
    icon: AlertCircle,
    className: "border-red-400 bg-red-50 dark:bg-red-950/30",
    defaultTitle: "Danger",
  },
};

export function Admonition({
  type = "note",
  title,
  children,
}: AdmonitionProps) {
  const { icon: Icon, className, defaultTitle } = config[type];

  return (
    <div
      className={cn(
        "my-4 rounded-lg border-l-4 p-4 not-prose",
        className
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-sm mb-2">
        <Icon className="h-4 w-4" />
        {title || defaultTitle}
      </div>
      <div className="text-sm text-[var(--color-text-secondary)] [&_p]:mt-1">
        {children}
      </div>
    </div>
  );
}
