'use client';

import { useState, useMemo } from "react"

interface UsePaginationOptions {
  defaultPerPage?: number
}

export function usePagination<T>(items: T[], options: UsePaginationOptions = {}) {
  const { defaultPerPage = 12 } = options
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(defaultPerPage)

  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

  // Reset to page 1 when items change significantly
  const safePage = Math.min(currentPage, totalPages)
  if (safePage !== currentPage) setCurrentPage(safePage)

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }, [items, safePage, itemsPerPage])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const changePerPage = (count: number) => {
    setItemsPerPage(count)
    setCurrentPage(1)
  }

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    totalItems,
    itemsPerPage,
    goToPage,
    changePerPage,
    resetPage: () => setCurrentPage(1),
  }
}
