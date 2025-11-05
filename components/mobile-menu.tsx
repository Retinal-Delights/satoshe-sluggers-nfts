// components/mobile-menu.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import SimpleConnectButton from "@/components/simple-connect-button"
import { NavLink } from "@/components/nav-link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createPortal } from "react-dom"
import { colors } from "@/lib/design-system"

interface MobileMenuProps {
  isWalletConnected?: boolean
  hasUserActivity?: boolean
}

export function MobileMenu({ isWalletConnected = false, hasUserActivity = false }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [walletConnected, setWalletConnected] = useState(isWalletConnected)
  const [userActivity, setUserActivity] = useState(hasUserActivity)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync with prop changes
  useEffect(() => {
    setWalletConnected(isWalletConnected)
    setUserActivity(hasUserActivity)
  }, [isWalletConnected, hasUserActivity])

  // Also listen for wallet connection events
  useEffect(() => {
    const handleWalletConnection = (event: Event) => {
      const customEvent = event as CustomEvent;
      setWalletConnected(customEvent.detail.connected)
    }

    window.addEventListener("walletConnectionChanged", handleWalletConnection)

    return () => {
      window.removeEventListener("walletConnectionChanged", handleWalletConnection)
    }
  }, [])

  // Focus management for mobile menu
  useEffect(() => {
    if (open && menuRef.current) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement
      
      // Focus the first focusable element in the menu
      const firstFocusable = menuRef.current.querySelector('button, a, input, select, textarea') as HTMLElement
      if (firstFocusable) {
        firstFocusable.focus()
      }
    } else if (!open && previousFocusRef.current) {
      // Restore focus when menu closes
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [open])

  // Handle escape key to close menu
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        handleClose()
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, isAnimating])

  // Determine active page from pathname
  const getActivePage = () => {
    if (pathname === "/") return "home"
    if (pathname === "/about") return "about"
    if (pathname === "/nfts") return "nfts"
    if (pathname === "/provenance") return "provenance"
    if (pathname === "/contact") return "contact"
    if (pathname === "/my-nfts") return "my-nfts"
    return ""
  }

  const activePage = getActivePage()

  const handleClose = () => {
    setIsAnimating(false)
    // Wait for exit animation to complete before hiding
    setTimeout(() => {
      setOpen(false)
    }, 200) // Match transition duration
  }

  const handleOpen = () => {
    setOpen(true)
    // Trigger enter animation after state updates
    setTimeout(() => {
      setIsAnimating(true)
    }, 10)
  }

  const mobileMenuContent = open && mounted && (
    <div 
      className={`fixed inset-0 z-[60] transition-opacity duration-200 ease-out ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backgroundColor: colors.background.overlay,
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-menu-title"
    >
          <div 
            ref={menuRef}
            className={`w-80 max-w-[90vw] fixed left-1/2 -translate-x-1/2 rounded-lg pt-4 pb-12 px-8 transition-all duration-200 ease-out ${
              isAnimating 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 -translate-y-4'
            }`}
        style={{
          top: '76px', // Position below navbar (navbar height is ~76px)
          maxHeight: 'calc(100vh - 100px)', // Leave some margin
          backgroundColor: colors.background.dark,
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="mobile-menu-title"
      >
            {/* Close button */}
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 p-0 hover:bg-neutral-800 rounded-full"
                onClick={handleClose}
                aria-label="Close mobile menu"
              >
                <X className="h-6 w-6 text-brand-pink" />
              </Button>
            </div>
            
            {/* Hidden title for screen readers */}
            <h2 id="mobile-menu-title" className="sr-only">Mobile Navigation Menu</h2>

        <div className="flex flex-col gap-2 py-2 items-center">
                  <div className="mb-4 flex items-center justify-center w-full">
                    <SimpleConnectButton />
                  </div>
          <nav className="flex flex-col space-y-3 items-center w-full">
            <NavLink 
              href="/" 
              isActive={activePage === "home"} 
              onClick={handleClose}
              ariaLabel="Navigate to home page"
              variant="mobile"
            >
              HOME
            </NavLink>
            <NavLink 
              href="/about" 
              isActive={activePage === "about"} 
              onClick={handleClose}
              ariaLabel="Navigate to about page"
              variant="mobile"
            >
              ABOUT
            </NavLink>
            <NavLink 
              href="/nfts" 
              isActive={activePage === "nfts"} 
              onClick={handleClose}
              ariaLabel="Navigate to NFTs collection page"
              variant="mobile"
            >
              NFTS
            </NavLink>
            <NavLink 
              href="/provenance" 
              isActive={activePage === "provenance"} 
              onClick={handleClose}
              ariaLabel="Navigate to provenance page"
              variant="mobile"
            >
              PROVENANCE
            </NavLink>
            <NavLink 
              href="/contact" 
              isActive={activePage === "contact"} 
              onClick={handleClose}
              ariaLabel="Navigate to contact page"
              variant="mobile"
            >
              CONTACT
            </NavLink>
            {walletConnected && (
              <NavLink 
                href="/my-nfts" 
                isActive={activePage === "my-nfts"} 
                onClick={handleClose}
                ariaLabel="Navigate to My NFTs page"
                variant="mobile"
              >
                MY NFTS
              </NavLink>
            )}
          </nav>
        </div>
          </div>
        </div>
  )

  return (
    <div className="lg:hidden flex items-center gap-2 sm:gap-4">
      {walletConnected && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/my-nfts"
                className="flex items-center justify-center group hover:scale-110 transition-transform duration-200"
                aria-label="Go to My NFTs page"
              >
                <Image
                  src="/icons/profile-icons/pink-profile-icon-48.png"
                  alt="My NFTs"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{userActivity ? "My NFTs" : "Profile"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="p-2 hover:bg-accent rounded-full transition-colors border border-neutral-700 cursor-pointer"
        onClick={() => {
          if (open) {
            handleClose()
          } else {
            handleOpen()
          }
        }}
      >
        <Menu className="h-9 w-9" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      
      {mounted && mobileMenuContent && createPortal(mobileMenuContent, document.body)}
    </div>
  )
}
