"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (count: number) => void
  perPageOptions?: number[]
}

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  perPageOptions = [12, 24, 48, 96],
}: PaginationControlsProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("ellipsis")
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("ellipsis")
      pages.push(totalPages)
    }
    return pages
  }

  if (totalPages <= 1 && !onItemsPerPageChange) return null

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border mt-6">
      {/* Info */}
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        {totalItems === 0 ? "No items" : `Showing ${startItem}\u2013${endItem} of ${totalItems}`}
      </p>

      {/* Page buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 order-1 sm:order-2">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent hidden sm:inline-flex" disabled={currentPage === 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="h-3.5 w-3.5" />
            <span className="sr-only">First</span>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="sr-only">Previous</span>
          </Button>

          {getPageNumbers().map((page, i) =>
            page === "ellipsis" ? (
              <span key={`e${i}`} className="w-8 text-center text-xs text-muted-foreground select-none">...</span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                className={`h-8 w-8 text-xs ${currentPage === page ? "bg-foreground text-background hover:bg-foreground/90" : "bg-transparent"}`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          )}

          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="sr-only">Next</span>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent hidden sm:inline-flex" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>
            <ChevronsRight className="h-3.5 w-3.5" />
            <span className="sr-only">Last</span>
          </Button>
        </div>
      )}

      {/* Items per page */}
      {onItemsPerPageChange && (
        <div className="flex items-center gap-2 order-3">
          <label htmlFor="perPage" className="text-xs text-muted-foreground">Per page</label>
          <select
            id="perPage"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="text-xs bg-background border border-border px-2 py-1.5 rounded-sm outline-none"
          >
            {perPageOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
