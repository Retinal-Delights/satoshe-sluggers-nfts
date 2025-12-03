// components/ui/pagination.tsx
"use client"

import React, { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"

// Page jump input component
function PageJumpInput({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const [inputValue, setInputValue] = useState(currentPage.toString())

  // Update input value when currentPage changes externally
  React.useEffect(() => {
    setInputValue(currentPage.toString())
  }, [currentPage])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNumber = Number.parseInt(inputValue)
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange(pageNumber)
      } else {
        setInputValue(currentPage.toString())
      }
    }
  }

  const handleBlur = () => {
    const pageNumber = Number.parseInt(inputValue)
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber)
    } else {
      setInputValue(currentPage.toString())
    }
  }

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-12 h-8 px-1 text-center bg-neutral-900 border border-brand-pink rounded text-sm text-brand-pink"
      aria-label="Go to page"
      spellCheck={false}
      autoComplete="off"
    />
  )
}

interface NFTPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  stickyToSection?: boolean // If true, sticky to section instead of fixed to viewport
}

export default function NFTPagination({
  currentPage = 1,
  totalPages = 5,
  totalItems: _totalItems = 50, // eslint-disable-line @typescript-eslint/no-unused-vars
  itemsPerPage: _itemsPerPage = 12, // eslint-disable-line @typescript-eslint/no-unused-vars
  onPageChange,
  stickyToSection = false,
}: NFTPaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always include first page
      pages.push(1)

      // Calculate start and end of page range
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)

      // Adjust if at the beginning
      if (currentPage <= 3) {
        endPage = 4
      }

      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push("ellipsis-start")
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push("ellipsis-end")
      }

      // Always include last page
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()
  const paginationRef = useRef<HTMLDivElement>(null)
  const [bottomOffset, setBottomOffset] = useState(0)
  const [leftOffset, setLeftOffset] = useState(0)
  const [width, setWidth] = useState('100%')

  useEffect(() => {
    // Only run footer detection for fixed (viewport) pagination
    if (stickyToSection) {
      return
    }

    const updatePosition = () => {
      // Find the NFT grid container to match its position and width
      const gridContainer = document.querySelector('.w-full.max-w-\\[1650px\\]') || 
                            document.querySelector('[class*="max-w-[1650px]"]')
      
      const footer = document.querySelector('footer')
      
      if (gridContainer && paginationRef.current) {
        const gridRect = gridContainer.getBoundingClientRect()
        
        // Set width and left position to match grid container
        setWidth(`${gridRect.width}px`)
        setLeftOffset(gridRect.left)
        
        // Footer detection
        if (footer) {
          const footerRect = footer.getBoundingClientRect()
          const viewportHeight = window.innerHeight
          const footerTop = footerRect.top
          
          // If footer is visible in viewport, set offset to prevent overlap
          if (footerTop < viewportHeight) {
            const offset = viewportHeight - footerTop + 10 // 10px gap
            setBottomOffset(offset)
          } else {
            setBottomOffset(0)
          }
        }
      }
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [stickyToSection])

  // Shared pagination content
  const paginationContent = (
    <div className="bg-neutral-900 py-3 px-4 rounded-t-lg border-t border-neutral-800 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
          >
            <ChevronFirst className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === "ellipsis-start" || page === "ellipsis-end") {
                return (
                  <span key={`ellipsis-${index}`} className="px-1 text-neutral-400 text-sm">
                    ...
                  </span>
                )
              }

              return (
                <Button
                  key={`page-${page}`}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className={
                    currentPage === page
                      ? "bg-brand-pink hover:bg-brand-pink/90 text-offwhite text-xs h-8 w-8 p-0"
                      : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-offwhite text-xs h-8 w-8 p-0"
                  }
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
          >
            <ChevronLast className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-neutral-400">Go to page:</div>
          <PageJumpInput currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      </div>

      {/* Page count display */}
      <div className="text-center mt-2">
        <span className="text-xs text-neutral-500">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  )

  // If sticky to section, use sticky positioning within parent
  if (stickyToSection) {
    return (
      <div className="sticky bottom-0 z-40 mt-8">
        {paginationContent}
      </div>
    )
  }

  // Fixed to viewport (default behavior for NFTs page)
  return (
    <>
      <div 
        ref={paginationRef}
        className="fixed z-40"
        style={{ 
          bottom: `${bottomOffset}px`,
          left: `${leftOffset}px`,
          width: width,
        }}
      >
        {paginationContent}
      </div>
      {/* Spacer to prevent content from being hidden behind fixed pagination */}
      <div className="h-24" />
    </>
  )
}

