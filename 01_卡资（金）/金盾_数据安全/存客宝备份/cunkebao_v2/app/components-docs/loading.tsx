import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ComponentsDocsLoading() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
      </div>

      <div className="space-y-6">
        <div className="flex space-x-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse flex-1" />
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
