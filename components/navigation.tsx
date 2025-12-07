"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { MobileMenu } from "@/components/mobile-menu"
import ConnectWalletButton from "@/components/simple-connect-button"
import { useActiveAccount } from "thirdweb/react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useDyslexiaMode } from "@/hooks/useDyslexiaMode"
import { Type } from "lucide-react"

interface NavigationProps {
  activePage?: "home" | "about" | "nfts" | "sell" | "my-nfts" | "contact" | "provenance"
}

export default function Navigation({ activePage = "home" }: NavigationProps) {
  const account = useActiveAccount()
  const { isDyslexiaMode, toggleDyslexiaMode, mounted } = useDyslexiaMode()

  return (
    <header className="border-b border-neutral-700 px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-3 sm:py-4 flex items-center justify-between bg-neutral-950/80 backdrop-blur-md fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center">
        <a href="https://retinaldelights.io" target="_blank" rel="noopener noreferrer" className="flex items-center">
          <Image
            src="/brands/retinal-delights/retinal_delights-horizontal-brand-offwhite-op.svg"
            alt="Retinal Delights"
            width={200}
            height={50}
            className="w-auto h-10 sm:h-12"
            priority
          />
        </a>
      </div>
      <nav className="hidden lg:flex items-center gap-4 xl:gap-5 2xl:gap-6 absolute left-1/2 transform -translate-x-1/2">
        <Link
          href="/"
          className={`text-xs lg:text-sm xl:text-base font-medium relative group ${
            activePage === "home" ? "text-brand-pink" : "text-neutral-400 hover:text-off-white"
          }`}
        >
          HOME
          <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-out ${
            activePage === "home" 
              ? "w-full bg-brand-pink" 
              : "w-0 group-hover:w-full bg-off-white"
          }`}></span>
        </Link>
        <Link
          href="/about"
          className={`text-xs lg:text-sm xl:text-base font-medium relative group ${
            activePage === "about" ? "text-brand-pink" : "text-neutral-400 hover:text-off-white"
          }`}
        >
          ABOUT
          <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-out ${
            activePage === "about" 
              ? "w-full bg-brand-pink" 
              : "w-0 group-hover:w-full bg-off-white"
          }`}></span>
        </Link>
        <Link
          href="/nfts"
          className={`text-xs lg:text-sm xl:text-base font-medium relative group ${
            activePage === "nfts" ? "text-brand-pink" : "text-neutral-400 hover:text-off-white"
          }`}
        >
          NFTS
          <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-out ${
            activePage === "nfts" 
              ? "w-full bg-brand-pink" 
              : "w-0 group-hover:w-full bg-off-white"
          }`}></span>
        </Link>
        <Link
          href="/provenance"
          className={`text-xs lg:text-sm xl:text-base font-medium relative group ${
            activePage === "provenance" ? "text-brand-pink" : "text-neutral-400 hover:text-off-white"
          }`}
        >
          PROVENANCE
          <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-out ${
            activePage === "provenance" 
              ? "w-full bg-brand-pink" 
              : "w-0 group-hover:w-full bg-off-white"
          }`}></span>
        </Link>
        <Link
          href="/contact"
          className={`text-xs lg:text-sm xl:text-base font-medium relative group ${
            activePage === "contact" ? "text-brand-pink" : "text-neutral-400 hover:text-off-white"
          }`}
        >
          CONTACT
          <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-out ${
            activePage === "contact" 
              ? "w-full bg-brand-pink" 
              : "w-0 group-hover:w-full bg-off-white"
          }`}></span>
        </Link>
        {account && (
          <Link
            href="/my-nfts"
            className={`text-xs lg:text-sm xl:text-base font-medium relative group ${
              activePage === "my-nfts" ? "text-brand-pink" : "text-neutral-400 hover:text-off-white"
            }`}
          >
            MY NFTS
            <span className={`absolute bottom-0 left-0 h-0.5 transition-all duration-300 ease-out ${
              activePage === "my-nfts" 
                ? "w-full bg-brand-pink" 
                : "w-0 group-hover:w-full bg-off-white"
            }`}></span>
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2 lg:gap-2.5 ml-4">
        {/* Dyslexia-Friendly Toggle */}
        {mounted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleDyslexiaMode}
                  className="flex items-center justify-center p-2 rounded-sm hover:bg-neutral-800 transition-colors cursor-pointer"
                  aria-label={isDyslexiaMode ? "Disable dyslexia-friendly font" : "Enable dyslexia-friendly font"}
                  aria-pressed={isDyslexiaMode}
                >
                  <Type 
                    className={`h-5 w-5 transition-colors ${
                      isDyslexiaMode ? "text-brand-pink" : "text-neutral-400"
                    }`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent 
                side="left" 
                sideOffset={8} 
                className="bg-neutral-800 text-off-white border-neutral-600"
                collisionPadding={20}
              >
                <p>{isDyslexiaMode ? "Dyslexia-friendly font: ON" : "Dyslexia-friendly font: OFF"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {account && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/my-nfts"
                  className="hidden lg:flex items-center justify-center group hover:scale-110 transition-transform duration-200"
                  aria-label="Profile"
                >
                  <Image
                    src="/icons/profile-icons/pink-profile-icon-48.png"
                    alt="Profile"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                </Link>
              </TooltipTrigger>
              <TooltipContent 
                side="left" 
                sideOffset={8} 
                className="bg-neutral-800 text-off-white border-neutral-600"
                collisionPadding={20}
              >
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="hidden lg:block">
          <ConnectWalletButton />
        </div>
        <MobileMenu isWalletConnected={!!account} />
      </div>
    </header>
  )
}