import { Card } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";

export function AccountCardSkeleton() {
  return (
    <Card className="flex flex-row rounded-md items-center justify-between px-4 py-3 animate-pulse">
      <div className="flex items-center gap-4 w-full">
        {/* Avatar skeleton */}
        <Skeleton className="h-11 w-13 rounded-full bg-muted" />

        {/* Text skeleton */}
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-4 w-32 rounded bg-muted" />
          <Skeleton className="h-3 w-48 rounded bg-muted" />
        </div>
      </div>
    </Card>
  );
}
