"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"

export function BindDouyinQRCode() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <QrCode className="h-4 w-4" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>绑定抖音号</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <img src="/placeholder.svg?height=256&width=256" alt="抖音二维码" className="w-full h-full" />
            </div>
            <p className="mt-4 text-sm text-gray-600">请使用抖音APP扫描二维码进行绑定</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
