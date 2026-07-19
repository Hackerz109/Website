import { Check, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  happyPathSteps,
  SIDE_TRACK_STATUSES,
  type OrderStatus,
  type FulfillmentType,
} from "@/lib/orderStatus";

export interface TimelineEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

interface OrderTimelineProps {
  fulfillmentType: FulfillmentType;
  currentStatus: OrderStatus;
  history: TimelineEntry[];
}

export function OrderTimeline({ fulfillmentType, currentStatus, history }: OrderTimelineProps) {
  const steps = happyPathSteps(fulfillmentType);
  const isSideTrack = SIDE_TRACK_STATUSES.includes(currentStatus);
  const currentIndex = steps.indexOf(currentStatus);

  return (
    <div className="space-y-5">
      {isSideTrack ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium",
            currentStatus === "cancelled" || currentStatus === "return_rejected"
              ? "bg-red-500/10 text-red-700"
              : "bg-amber-500/10 text-amber-700",
          )}
        >
          {currentStatus === "cancelled" ? <X className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          {ORDER_STATUS_LABELS[currentStatus]}
        </div>
      ) : (
        <div className="flex items-center">
          {steps.map((step, i) => {
            const done = currentIndex >= 0 && i <= currentIndex;
            const isLast = i === steps.length - 1;
            return (
              <div key={step} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                      done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn("hidden text-center text-[11px] leading-tight sm:block", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                    {ORDER_STATUS_LABELS[step]}
                  </span>
                </div>
                {!isLast && (
                  <div className={cn("mx-1 h-0.5 flex-1", i < currentIndex ? "bg-primary" : "bg-secondary")} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3 border-t pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
        <ul className="space-y-2.5">
          {history.map((h) => (
            <li key={h.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{ORDER_STATUS_LABELS[h.status]}</p>
                {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {new Date(h.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
