import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const DISCLAIMER =
  "AI-generated content may contain errors. Review before using. Do not enter confidential information.";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-xs text-muted-foreground", className)}>
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
