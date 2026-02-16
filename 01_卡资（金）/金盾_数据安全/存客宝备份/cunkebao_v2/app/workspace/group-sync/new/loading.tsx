import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="h-8 mb-8">
          <Skeleton className="h-full w-full" />
        </div>

        <Card className="p-6">
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />

            <div className="space-y-4">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-4">
              <Skeleton className="h-5 w-1/4" />
              <div className="flex space-x-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>

            <div className="space-y-4">
              <Skeleton className="h-5 w-1/4" />
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
