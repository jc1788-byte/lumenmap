"use client";

import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/components/dashboard/DashboardProvider";
import { cn } from "@/lib/utils";

/**
 * Retry control that always refetches the primary network-activity query.
 *
 * Every widget that depends on the shared `/api/v1/activity` response renders
 * this so a single click targets the failed query family, never a secondary
 * chart such as category share.
 */
export function ActivityRetryButton({
  className,
  testId = "activity-retry",
}: {
  className?: string;
  testId?: string;
}) {
  const { refetch, isFetching } = useDashboard();
  const [isRetrying, setIsRetrying] = useState(false);
  const pending = isRetrying || isFetching;

  const handleRetry = async () => {
    if (pending) return;
    setIsRetrying(true);
    try {
      await refetch();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={pending}
      aria-busy={pending}
      aria-label={
        pending
          ? "Retrying network activity data"
          : "Retry loading network activity data"
      }
      data-testid={testId}
      className={cn(
        "gap-2 border-red-500/30 text-red-100 hover:bg-red-500/10",
        className,
      )}
    >
      <RefreshCw
        className={cn("h-4 w-4", pending && "animate-spin")}
        aria-hidden="true"
      />
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}

/**
 * Inline note for widgets that depend on the shared activity request.
 *
 * It makes clear the widget failed with the same upstream request while
 * independently loaded charts may still be live.
 */
export function ActivityUnavailableNote({
  className,
}: {
  className?: string;
}) {
  return (
    <p
      className={cn("text-xs text-red-200/70", className)}
      data-testid="activity-unavailable-note"
    >
      This widget uses the network activity request, which failed to load.
      Charts that load independently may still be live.
    </p>
  );
}

/**
 * Primary, page-level error for the shared network-activity request.
 *
 * Explains that the request is shared by KPIs, the treemap, time series, and
 * heatmaps, so those failed together, while secondary charts loaded from other
 * endpoints can still succeed.
 */
export function ActivityErrorBanner() {
  const { isError, error } = useDashboard();

  if (!isError) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="activity-error-banner"
      className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
          aria-hidden="true"
        />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-semibold text-red-100">
            Network activity couldn&apos;t be loaded
          </p>
          <p className="text-sm text-red-200/90">
            KPIs, the treemap, time series, and heatmaps share one Hubble
            BigQuery request, so they failed together. Charts that load
            independently — such as category share — may still be live below.
          </p>
          {error?.message ? (
            <p className="break-words text-xs text-red-200/70">
              {error.message}
            </p>
          ) : null}
          <ActivityRetryButton className="mt-1" />
        </div>
      </div>
    </div>
  );
}
