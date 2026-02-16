"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Play, Video } from "lucide-react"
import { usePathname } from "next/navigation"
import { getPageTutorials } from "@/lib/tutorials"

export function VideoTutorialButton() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const tutorials = getPageTutorials(pathname)

  const handleOpenDialog = () => {
    setIsOpen(true)
  }

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-20 right-4 h-12 w-12 rounded-full shadow-lg bg-white hover:bg-gray-50 border z-50"
        onClick={handleOpenDialog}
      >
        <Video className="h-5 w-5 text-gray-600" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[640px] p-0">
          <DialogHeader>
            <DialogTitle className="p-4 border-b">视频教程</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {tutorials.length > 0 ? (
              <div className="space-y-4">
                {tutorials.map((tutorial) => (
                  <div key={tutorial.id} className="flex items-center space-x-4">
                    <div className="w-24 h-16 bg-gray-200 rounded-lg relative overflow-hidden">
                      <img
                        src={tutorial.thumbnailUrl || "/placeholder.svg"}
                        alt={tutorial.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{tutorial.title}</h3>
                      <p className="text-sm text-gray-500">{tutorial.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">暂无该页面的教程视频</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
