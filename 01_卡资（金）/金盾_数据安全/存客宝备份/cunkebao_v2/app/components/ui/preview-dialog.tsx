"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { Button } from "./button"
import { Eye } from "lucide-react"

interface PreviewDialogProps {
  children: React.ReactNode
  title?: string
}

export function PreviewDialog({ children, title = "预览效果" }: PreviewDialogProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Eye className="w-4 h-4 mr-2" />
        预览
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[360px] p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="relative bg-gray-50">
            <div className="w-full overflow-hidden">{children}</div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
