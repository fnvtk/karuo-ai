import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="container mx-auto py-4 px-4 sm:px-6 md:py-6">
      <div className="flex items-center mb-6">
        <Skeleton className="h-9 w-9 rounded-md mr-2" />
        <Skeleton className="h-7 w-48" />
      </div>

      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center relative">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="mt-2 text-center">
                <Skeleton className="h-4 w-16 mt-2" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </div>
            {i < 4 && <Skeleton className="h-0.5 w-16 md:w-24 lg:w-32 mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="flex">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 flex-1" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-12" />
          </div>

          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-12" />
          </div>

          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </Card>

      <div className="flex space-x-2 justify-end mt-6">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}
