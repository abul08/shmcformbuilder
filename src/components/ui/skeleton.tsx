import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/5", className)}
      {...props}
    />
  )
}

export { Skeleton }

// Pre-built skeleton patterns
export function FormCardSkeleton() {
  return (
    <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-5">
      <div className="flex justify-between items-start gap-2 mb-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-4" />
      <Skeleton className="h-3 w-24" />
    </div>
  )
}

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b border-white/10">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export function FieldSkeleton() {
  return (
    <div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      <Skeleton className="h-10 w-full mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
