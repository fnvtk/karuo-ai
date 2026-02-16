"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const [jumpToPage, setJumpToPage] = useState("")

  useEffect(() => {
    // Reset jump input when page changes externally
    setJumpToPage(currentPage.toString());
  }, [currentPage]);

  const handleJumpToPage = () => {
    const page = parseInt(jumpToPage)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  const handleJumpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJumpToPage(e.target.value);
  };

  const handleJumpInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const handleInternalPageSizeChange = (size: string) => {
    const newSize = parseInt(size)
    onPageSizeChange(newSize)
  }

  // --- Page Number Logic --- (Same as customer pool)
  const MAX_VISIBLE_PAGES = 5;
  let startPage = 1;
  let endPage = totalPages;

  if (totalPages > MAX_VISIBLE_PAGES) {
    const halfVisible = Math.floor(MAX_VISIBLE_PAGES / 2);
    if (currentPage <= halfVisible + 1) {
      endPage = MAX_VISIBLE_PAGES;
    } else if (currentPage >= totalPages - halfVisible) {
      startPage = totalPages - MAX_VISIBLE_PAGES + 1;
    } else {
      startPage = currentPage - halfVisible;
      endPage = currentPage + halfVisible;
    }
  }

  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  // --- End Page Number Logic ---

  if (totalPages <= 0) {
    return null; // Don't render pagination if there are no pages
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mt-4 px-2 py-2 border-t">
      <div className="text-sm text-muted-foreground">
        共 {totalItems} 条记录
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Select value={pageSize.toString()} onValueChange={handleInternalPageSizeChange}>
          <SelectTrigger className="w-[100px] h-9">
            <SelectValue placeholder="每页条数" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 条/页</SelectItem>
            <SelectItem value="30">30 条/页</SelectItem>
            <SelectItem value="50">50 条/页</SelectItem>
            <SelectItem value="100">100 条/页</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Numbers */} 
        {startPage > 1 && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(1)}
          >
            1
          </Button>
        )}
        {startPage > 2 && (
           <span className="text-muted-foreground">...</span>
        )}

        {pageNumbers.map((page) => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages -1 && (
           <span className="text-muted-foreground">...</span>
        )}
        {endPage < totalPages && (
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        )}
        {/* End Page Numbers */} 

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="1"
            max={totalPages}
            className="h-9 w-16"
            placeholder="页码"
            value={jumpToPage}
            onChange={handleJumpInputChange}
            onKeyDown={handleJumpInputKeyDown}
          />
          <Button variant="outline" size="sm" className="h-9" onClick={handleJumpToPage}>跳转</Button>
        </div>
      </div>
    </div>
  )
} 