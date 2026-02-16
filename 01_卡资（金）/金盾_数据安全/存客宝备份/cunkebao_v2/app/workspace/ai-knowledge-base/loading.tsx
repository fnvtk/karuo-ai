import { Skeleton } from "@/components/ui/skeleton"

export default function AIKnowledgeBaseLoading() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded" />
            <div>
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <Skeleton className="h-11 w-full" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
