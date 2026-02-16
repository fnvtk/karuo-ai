import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="h-8 mb-8">
          <Skeleton className="h-full w-full" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-1/3 mb-6" />

            <div className="space-y-4">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-4 mt-4">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div>
                <Skeleton className="h-5 w-1/2 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>

            <Skeleton className="h-10 w-full mt-6" />
          </Card>

          <Card className="p-6">
            <Skeleton className="h-6 w-1/3 mb-6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </Card>
        </div>
      </div>
    </div>
  )
}
