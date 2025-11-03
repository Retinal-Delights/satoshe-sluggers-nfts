"use client"

import React, { useState, useMemo } from "react"
import { ChevronDown, ChevronRight, Search, X, ArrowDown, ArrowUp, ExternalLink } from "lucide-react"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { announceToScreenReader } from "@/lib/accessibility-utils"

// Simple types
interface FilterState {
  rarity?: string[];
  background?: string[];
  skinTone?: string[];
  shirt?: string[];
  hair?: Record<string, string[]>;
  eyewear?: string[];
  headwear?: Record<string, string[]>;
}

interface NFTSidebarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchMode: "exact" | "contains";
  setSearchMode: (mode: "exact" | "contains") => void;
  selectedFilters: FilterState;
  setSelectedFilters: (val: FilterState) => void;
  traitCounts?: Record<string, Record<string, number>>;
}

// Simple filter section component
function FilterSection({ 
  title, 
  color, 
  options, 
  selected = [], 
  onChange, 
  traitCounts = {},
  icon,
  sortable = false
}: {
  title: string;
  color: string;
  options: string[] | { value: string; display: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  traitCounts?: Record<string, Record<string, number>>;
  icon?: React.ReactNode;
  sortable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [sortOrder, setSortOrder] = useState("commonToRare")

  const colorClasses: Record<string, string> = {
    purple: "text-purple-400",
    blue: "text-blue-500",
    amber: "text-amber-500",
    red: "text-red-500",
    green: "text-emerald-500",
    cyan: "text-cyan-500",
    orange: "text-orange-500",
  }

  const borderClasses: Record<string, string> = {
    purple: "border-purple-400",
    blue: "border-blue-500",
    amber: "border-amber-500",
    red: "border-red-500",
    green: "border-emerald-500",
    cyan: "border-cyan-500",
    orange: "border-orange-500",
  }

  const handleCheckboxChange = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(o => o !== option))
      } else {
      onChange([...selected, option])
    }
  }

  const getTraitKey = (title: string) => {
    const keyMap: Record<string, string> = {
      "Background": "background",
      "Skin Tone": "skinTone", 
      "Shirt": "shirt",
      "Eyewear": "eyewear",
      "Rarity Tiers": "rarity"
    }
    return keyMap[title] || title.toLowerCase()
  }

  const getCount = (option: string) => {
    const key = getTraitKey(title)
    // Normalize rarity tier values for lookup (remove " (Ultra-Legendary)" suffix)
    const normalizedOption = option === "Grand Slam (Ultra-Legendary)" ? "Grand Slam" : option
    return traitCounts[key]?.[normalizedOption]
  }

  // Sort options based on sortOrder when sortable is true
  const sortedOptions = useMemo(() => {
    if (!sortable || sortOrder === "commonToRare") {
      return options
    }
    // Reverse the array for "Rare to Common" order
    return [...options].reverse()
  }, [options, sortOrder, sortable])

  return (
    <div className={`${isOpen ? 'pt-3 pb-3' : 'pt-1'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-1.5 focus:outline-none text-off-white ${isOpen ? `border-b ${borderClasses[color]} pb-1.5` : ''}`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className={colorClasses[color]}>{icon}</span>}
          <h3 className={`font-normal text-fluid-md ${isOpen ? colorClasses[color] : 'text-off-white'}`}>
            {title}
          </h3>
          {/* Active filter indicator */}
          {selected && selected.length > 0 && (
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: color === 'red' ? '#ef4444' : 
                       color === 'blue' ? '#3b82f6' : 
                       color === 'green' ? '#10b981' : 
                       color === 'yellow' ? '#f59e0b' : 
                       color === 'purple' ? '#8b5cf6' : 
                       color === 'orange' ? '#f97316' : 
                       color === 'cyan' ? '#06b6d4' : 
                       color === 'amber' ? '#f59e0b' : '#6b7280' }}
            />
          )}
      </div>
        {isOpen ? (
          <ChevronDown className={`h-5 w-5 ${colorClasses[color]}`} />
        ) : (
          <ChevronRight className={`h-5 w-5 ${colorClasses[color]}`} />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1">
          {sortable && (
            <div className="mb-3 px-1">
            <span className="text-neutral-400 block mb-1 text-fluid-sm">Sort by:</span>
            <button
                onClick={() => setSortOrder(sortOrder === "commonToRare" ? "rareToCommon" : "commonToRare")}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors w-full justify-between text-off-white text-fluid-sm"
            >
              <span className={colorClasses[color]}>
                {sortOrder === "commonToRare" ? "Common to Rare" : "Rare to Common"}
              </span>
              {sortOrder === "commonToRare" ? (
                <ArrowDown className={`h-3.5 w-3.5 ${colorClasses[color]}`} />
              ) : (
                <ArrowUp className={`h-3.5 w-3.5 ${colorClasses[color]}`} />
              )}
            </button>
          </div>
          )}

      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
            {sortedOptions.map((option) => {
              const optValue = typeof option === 'string' ? option : option.value
              const optDisplay = typeof option === 'string' ? option : option.display
              const count = getCount(optValue)
              
              return (
                <div key={optValue} className="flex items-center group hover:bg-neutral-800/50 rounded px-1 py-0.5 transition-colors">
                <div className="relative flex items-center w-full">
                  <input
                    type="checkbox"
                      id={optValue}
                      checked={selected.includes(optValue)}
                      onChange={() => handleCheckboxChange(optValue)}
                    className="sidebar-checkbox mr-2 flex-shrink-0"
                    style={{
                      '--checkbox-color': color === 'purple' ? '#8b5cf6' : 
                                        color === 'blue' ? '#3b82f6' :
                                        color === 'amber' ? '#f59e0b' :
                                        color === 'red' ? '#ef4444' :
                                        color === 'green' ? '#10b981' :
                                        color === 'cyan' ? '#06b6d4' :
                                        color === 'orange' ? '#f97316' : '#8b5cf6'
                    } as React.CSSProperties}
                  />
                  <label
                      htmlFor={optValue}
                      className="text-neutral-300 cursor-pointer flex-1 py-0.5 whitespace-pre-line leading-tight min-w-0 text-fluid-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                        <span className="break-words min-w-0">{optDisplay.replace('\n', ' ')}</span>
                        {count && (
                          <span className={`${colorClasses[color]} font-medium flex-shrink-0 ml-1 text-fluid-xs`}>
                            ({count})
                          </span>
                        )}
                    </div>
                  </label>
                  </div>
                </div>
              )
            })}
          </div>
      </div>
      )}
    </div>
  )
}

// Simple subcategory component
function SubcategorySection({
  title,
  color,
  subcategories,
  selected = {},
  onChange,
  traitCounts = {},
  icon
}: {
  title: string;
  color: string;
  subcategories: Array<{ name: string; options: string[] }>;
  selected: Record<string, string[]>;
  onChange: (selected: Record<string, string[]>) => void;
  traitCounts?: Record<string, Record<string, number>>;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false)

  const colorClasses: Record<string, string> = {
    purple: "text-purple-400",
    blue: "text-blue-500",
    amber: "text-amber-500",
    red: "text-red-500",
    green: "text-emerald-500",
    cyan: "text-cyan-500",
    orange: "text-orange-500",
  }

  const borderClasses: Record<string, string> = {
    purple: "border-purple-400",
    blue: "border-blue-500",
    amber: "border-amber-500",
    red: "border-red-500",
    green: "border-emerald-500",
    cyan: "border-cyan-500",
    orange: "border-orange-500",
  }

  const handleSubcategoryToggle = (subcategoryName: string) => {
    if (selected[subcategoryName]) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [subcategoryName]: removed, ...rest } = selected
      onChange(rest)
    } else {
      onChange({ ...selected, [subcategoryName]: [] })
    }
  }

  const handleColorToggle = (subcategoryName: string, color: string) => {
    const prevArr = selected[subcategoryName] || []
    if (prevArr.includes(color)) {
      const newArr = prevArr.filter(c => c !== color)
      onChange({ ...selected, [subcategoryName]: newArr })
    } else {
      onChange({ ...selected, [subcategoryName]: [...prevArr, color] })
    }
  }

  const getTraitKey = (title: string) => {
    return title === "Hair" ? "hair" : title === "Headwear" ? "headwear" : title.toLowerCase()
  }

  return (
    <div className={`${isOpen ? 'pt-3 pb-3' : 'pt-1'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-1.5 focus:outline-none text-off-white ${isOpen ? `border-b ${borderClasses[color]} pb-1.5` : ''}`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className={colorClasses[color]}>{icon}</span>}
          <h3 className={`font-normal text-fluid-md ${isOpen ? colorClasses[color] : 'text-off-white'}`}>
            {title}
          </h3>
          {/* Active filter indicator for subcategories */}
          {Object.values(selected).some(arr => arr && arr.length > 0) && (
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ backgroundColor: color === 'purple' ? '#8b5cf6' : 
                       color === 'blue' ? '#3b82f6' : 
                       color === 'green' ? '#10b981' : 
                       color === 'yellow' ? '#f59e0b' : 
                       color === 'red' ? '#ef4444' : 
                       color === 'cyan' ? '#06b6d4' : 
                       color === 'orange' ? '#f97316' : '#6b7280' }}
            />
          )}
        </div>
        {isOpen ? (
          <ChevronDown className={`h-5 w-5 ${colorClasses[color]}`} />
        ) : (
          <ChevronRight className={`h-5 w-5 ${colorClasses[color]}`} />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1">
          {subcategories.map((subcategory) => {
            const isChecked = !!selected[subcategory.name]
            const key = getTraitKey(title)
            let totalCount = 0
            subcategory.options.forEach(option => {
              const fullValue = `${subcategory.name} ${option}`
              totalCount += traitCounts[key]?.[fullValue] || 0
            })

            return (
              <div key={subcategory.name} className="pl-1">
                <div className="flex items-center mb-0.5 cursor-pointer" onClick={() => handleSubcategoryToggle(subcategory.name)}>
                  {isChecked ? (
                    <ChevronDown className={`h-4 w-4 mr-1 transition-transform duration-200 ${colorClasses[color]}`} />
                  ) : (
                    <ChevronRight className={`h-4 w-4 mr-1 transition-transform duration-200 ${colorClasses[color]}`} />
                  )}
                  <input
                    type="checkbox"
                    id={`subcat-${subcategory.name}`}
                    checked={isChecked}
                    onChange={() => handleSubcategoryToggle(subcategory.name)}
                    className="sidebar-checkbox mr-2"
                    style={{
                      '--checkbox-color': color === 'purple' ? '#8b5cf6' : 
                                        color === 'blue' ? '#3b82f6' :
                                        color === 'amber' ? '#f59e0b' :
                                        color === 'red' ? '#ef4444' :
                                        color === 'green' ? '#10b981' :
                                        color === 'cyan' ? '#06b6d4' :
                                        color === 'orange' ? '#f97316' : '#8b5cf6'
                    } as React.CSSProperties}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                  <label
                    htmlFor={`subcat-${subcategory.name}`}
                    className={`cursor-pointer py-0.5 pr-2 block flex-1 text-fluid-sm ${isChecked ? `border-b ${borderClasses[color]} pb-1` : ''}`}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between pb-1">
                      <span className={colorClasses[color]}>{subcategory.name}</span>
                      {totalCount > 0 && (
                          <span className={`${colorClasses[color]} font-medium text-fluid-xs`}>
                            ({totalCount})
                          </span>
                      )}
                    </div>
                  </label>
                </div>

                {isChecked && (
                  <div className="ml-7 mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
                    {subcategory.options.map((option) => {
                      const fullValue = `${subcategory.name} ${option}`
                      const count = traitCounts[key]?.[fullValue]
                      
                      return (
                        <div key={option} className="flex items-center group hover:bg-neutral-800/50 rounded px-1 py-0.5 transition-colors">
                        <input
                          type="checkbox"
                          id={`${subcategory.name}-${option}`}
                          checked={selected[subcategory.name]?.includes(option) ?? false}
                            onChange={() => handleColorToggle(subcategory.name, option)}
                          className="sidebar-checkbox mr-2 flex-shrink-0"
                          style={{
                            '--checkbox-color': color === 'purple' ? '#8b5cf6' : 
                                              color === 'blue' ? '#3b82f6' :
                                              color === 'amber' ? '#f59e0b' :
                                              color === 'red' ? '#ef4444' :
                                              color === 'green' ? '#10b981' :
                                              color === 'cyan' ? '#06b6d4' :
                                              color === 'orange' ? '#f97316' : '#8b5cf6'
                          } as React.CSSProperties}
                        />
                        <label
                          htmlFor={`${subcategory.name}-${option}`}
                          className="text-neutral-300 cursor-pointer flex-1 py-0.5 min-w-0 text-fluid-xs"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="break-words min-w-0">{option}</span>
                            {count && (
                              <span className={`${colorClasses[color]} font-medium flex-shrink-0 ml-1 text-fluid-xs`}>
                                ({count})
                              </span>
                            )}
                          </div>
                        </label>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
                  })}
                </div>
      )}
    </div>
  )
}

// Helper function to remove "Eyewear" prefix from display
const formatEyewearDisplay = (value: string): string => {
  if (value.startsWith("Eyewear ")) {
    return value.replace("Eyewear ", "");
  }
  return value;
};

// Fallback options
const FALLBACK_OPTIONS = {
  background: ["Field", "Dugout", "Stadium", "Sky", "Night"],
  skinTone: ["Light", "Medium", "Dark", "Tan"],
  shirt: ["White", "Gray", "Black", "Blue", "Red"],
  eyewear: ["Eyeglasses", "Eyewear Confetti Shades", "Eyewear Diamond Shades", "Eyewear Eyeblack", "Eyewear Gold Shades", "Sunglasses"],
  hair: [
    { name: "Banana Clip", options: ["Black", "Blonde", "Blue", "Brown", "Confetti", "Gold", "Grey", "Pink", "Purple", "Red"] },
    { name: "Bob", options: ["Black", "Blonde", "Blue", "Brown", "Diamond", "Grey", "Pink", "Purple", "Red"] },
    { name: "Crew Cut", options: ["Black", "Blonde", "Blue", "Brown", "Diamond", "Grey", "Pink", "Purple", "Red"] },
    { name: "Curly", options: ["Black", "Blonde", "Blue", "Brown", "Confetti", "Grey", "Pink", "Purple", "Red"] },
    { name: "Pixie Cut", options: ["Confetti", "Gold"] },
    { name: "Ponytail", options: ["Black", "Blonde", "Blue", "Brown", "Grey", "Pink", "Purple", "Red"] },
    { name: "Side Part", options: ["Black", "Blonde", "Blue", "Brown", "Grey", "Pink", "Purple", "Red"] },
    { name: "Straight", options: ["Black", "Blonde", "Blue", "Brown", "Confetti", "Grey", "Pink", "Purple", "Red"] },
  ],
  headwear: [
    { name: "Baseball Cap", options: ["Black", "Blue", "Confetti", "Diamond", "Gold", "Green", "Pink", "Purple", "Red"] },
    { name: "Batters Helmet", options: ["Black", "Blue", "Confetti", "Diamond", "Gold", "Green", "Pink", "Purple", "Red"] },
    { name: "Snapback", options: ["Black", "Blue", "Confetti", "Diamond", "Gold", "Green", "Pink", "Purple", "Red"] },
  ]
}

// Rarity tiers
const RARITY_TIERS = [
  { value: "Ground Ball", display: "Ground Ball" },
  { value: "Base Hit", display: "Base Hit" },
  { value: "Double", display: "Double" },
  { value: "Stand-Up Double", display: "Stand-Up Double" },
  { value: "Line Drive", display: "Line Drive" },
  { value: "Triple", display: "Triple" },
  { value: "Pinch Hit Home Run", display: "Pinch Hit Home Run" },
  { value: "Home Run", display: "Home Run" },
  { value: "Over-the-Fence Shot", display: "Over-the-Fence Shot" },
  { value: "Walk-Off Home Run", display: "Walk-Off Home Run" },
  { value: "Grand Slam (Ultra-Legendary)", display: "Grand Slam" },
]

export default function NFTSidebar({ 
  searchTerm, 
  setSearchTerm, 
  searchMode, 
  setSearchMode, 
  selectedFilters, 
  setSelectedFilters, 
  traitCounts = {} 
}: NFTSidebarProps) {


  const clearAllFilters = () => {
    setSearchTerm("")
    setSearchMode("contains")
    setSelectedFilters({})
    announceToScreenReader("All filters cleared")
  }

  // Wrapper functions with announcements
  const handleRarityChange = (arr: string[]) => {
    setSelectedFilters({ ...selectedFilters, rarity: arr })
    if (arr.length > 0) {
      announceToScreenReader(`Rarity filter applied: ${arr.join(', ')}`)
    } else {
      announceToScreenReader("Rarity filter cleared")
    }
  }

  const handleBackgroundChange = (arr: string[]) => {
    setSelectedFilters({ ...selectedFilters, background: arr })
    if (arr.length > 0) {
      announceToScreenReader(`Background filter applied: ${arr.join(', ')}`)
    } else {
      announceToScreenReader("Background filter cleared")
    }
  }

  const handleSkinToneChange = (arr: string[]) => {
    setSelectedFilters({ ...selectedFilters, skinTone: arr })
    if (arr.length > 0) {
      announceToScreenReader(`Skin tone filter applied: ${arr.join(', ')}`)
    } else {
      announceToScreenReader("Skin tone filter cleared")
    }
  }

  const handleShirtChange = (arr: string[]) => {
    setSelectedFilters({ ...selectedFilters, shirt: arr })
    if (arr.length > 0) {
      announceToScreenReader(`Shirt filter applied: ${arr.join(', ')}`)
    } else {
      announceToScreenReader("Shirt filter cleared")
    }
  }

  const handleHairChange = (selected: Record<string, string[]>) => {
    setSelectedFilters({ ...selectedFilters, hair: selected })
    const selectedCount = Object.values(selected).flat().length
    if (selectedCount > 0) {
      announceToScreenReader(`Hair filter applied: ${selectedCount} items selected`)
    } else {
      announceToScreenReader("Hair filter cleared")
    }
  }

  const handleEyewearChange = (arr: string[]) => {
    setSelectedFilters({ ...selectedFilters, eyewear: arr })
    if (arr.length > 0) {
      announceToScreenReader(`Eyewear filter applied: ${arr.join(', ')}`)
    } else {
      announceToScreenReader("Eyewear filter cleared")
    }
  }

  const handleHeadwearChange = (selected: Record<string, string[]>) => {
    setSelectedFilters({ ...selectedFilters, headwear: selected })
    const selectedCount = Object.values(selected).flat().length
    if (selectedCount > 0) {
      announceToScreenReader(`Headwear filter applied: ${selectedCount} items selected`)
    } else {
      announceToScreenReader("Headwear filter cleared")
    }
  }

  const handleSearchModeChange = (mode: "exact" | "contains") => {
    setSearchMode(mode)
    announceToScreenReader(`Search mode changed to ${mode}`)
  }

  return (
    <div
      className="w-full max-w-[95vw] sm:max-w-3xl lg:max-w-4xl xl:max-w-full 2xl:max-w-full space-y-2 bg-card p-3 lg:p-4 pt-6 rounded border border-neutral-700 shadow-sm"
      suppressHydrationWarning={true}
    >
      {/* Blockchain Info */}
        <div className="space-y-1 mb-4 p-3 border border-neutral-700 rounded">
          <div>
          <div className="font-mono font-extralight text-off-white mb-0 text-fluid-xs">Blockchain: Base</div>
        </div>
          <div>
          <div className="font-mono font-extralight text-off-white mb-0 text-fluid-xs">Chain ID: 8453</div>
        </div>
          <div>
          <div className="font-mono font-extralight text-off-white mb-2 text-fluid-xs">Token Standard: ERC-721</div>
        </div>

        {/* Contract Links */}
        <div className="space-y-3 mt-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono font-extralight text-off-white text-fluid-xs">Marketplace</h4>
            </div>
            <div className="flex gap-2">
               <button
                onClick={() => window.open(`https://basescan.org/address/${process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS}`, '_blank')}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-1.5 rounded transition-colors border border-neutral-600 flex items-center justify-center gap-1 text-off-white cursor-pointer text-fluid-xs"
              >
                BaseScan
                <ExternalLink className="h-3 w-3 text-off-white" />
              </button>
              <button
                onClick={() => window.open(`https://base.blockscout.com/address/${process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS}`, '_blank')}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-1.5 rounded transition-colors border border-neutral-600 flex items-center justify-center gap-1 text-off-white cursor-pointer text-fluid-xs"
              >
                Blockscout
                <ExternalLink className="h-3 w-3 text-off-white" />
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-mono font-extralight text-off-white text-fluid-xs">NFT Contract</h4>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => window.open(`https://basescan.org/address/${process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS}`, '_blank')}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-1.5 rounded transition-colors border border-neutral-600 flex items-center justify-center gap-1 text-off-white cursor-pointer text-fluid-xs"
              >
                BaseScan
                <ExternalLink className="h-3 w-3 text-off-white" />
              </button>
              <button
                onClick={() => window.open(`https://base.blockscout.com/address/${process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS}`, '_blank')}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 px-2 py-1.5 rounded transition-colors border border-neutral-600 flex items-center justify-center gap-1 text-off-white cursor-pointer text-fluid-xs"
              >
                Blockscout
                <ExternalLink className="h-3 w-3 text-off-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-neutral-700 mb-4"></div>

      {/* Search */}
      <div suppressHydrationWarning={true}>
        <h3 className="font-normal mb-2 text-off-white text-fluid-md">Search</h3>
        
        <div className="mb-3">
          <div className="flex bg-neutral-700 rounded p-1">
            <button
              onClick={() => handleSearchModeChange("contains")}
              className={`flex-1 px-3 py-1.5 rounded transition-colors text-fluid-sm ${
                searchMode === "contains"
                  ? "bg-brand-pink text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
              aria-pressed={searchMode === "contains"}
            >
              Contains
            </button>
            <button
              onClick={() => handleSearchModeChange("exact")}
              className={`flex-1 px-3 py-1.5 rounded transition-colors text-fluid-sm ${
                searchMode === "exact"
                  ? "bg-brand-pink text-white"
                  : "text-neutral-200 hover:text-white"
              }`}
              aria-pressed={searchMode === "exact"}
            >
              Exact
            </button>
          </div>
        </div>
        
        <div className="relative mb-2" suppressHydrationWarning={true}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Search NFTs..."
            className="pl-9 py-1.5 font-light h-8 rounded text-brand-pink border-neutral-600 focus:outline-none focus:ring-0 focus:border-brand-pink transition-colors placeholder:font-light text-fluid-sm"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearchTerm(e.target.value)
            }}
            aria-label="Search NFTs by name, token ID, or NFT number"
            spellCheck={false}
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="font-medium flex items-center justify-center h-8 w-full mb-4 rounded border-brand-pink text-brand-pink bg-transparent hover:bg-brand-pink hover:text-white focus:outline-none focus:ring-0 focus:border-brand-pink transition-colors text-fluid-sm"
          aria-label="Search NFTs"
        >
          Search
        </Button>
        <div className="border-b border-neutral-700 mb-4"></div>
      </div>

      {/* Clear All Filters */}
      <div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearAllFilters}
          className="font-light flex items-center justify-center gap-1 h-9 w-full rounded border-neutral-500 text-neutral-300 hover:bg-neutral-700 hover:text-white hover:border-neutral-400 focus:outline-none focus:ring-0 focus:border-neutral-400 transition-colors text-fluid-sm"
          aria-label="Clear all filters and search"
        >
          <X className="h-4 w-4" /> Clear All Filters
        </Button>
      </div>

      {/* Filter Sections */}
      <FilterSection
          title="Rarity Tiers"
          color="orange"
        options={RARITY_TIERS}
        selected={selectedFilters.rarity || []}
        onChange={handleRarityChange}
        traitCounts={traitCounts}
          icon={
          <Image
              src="/icons/nft-sidebar-categories/rarity-tier-orange.svg"
              alt="Rarity Tiers"
              width={18}
              height={18}
              className="text-orange-400"
            />
          }
        sortable={true}
        />

      <FilterSection
          title="Background"
          color="blue"
        options={traitCounts["background"] ? Object.keys(traitCounts["background"]).sort().map(value => ({ value, display: value })) : FALLBACK_OPTIONS.background.map(value => ({ value, display: value }))}
        selected={selectedFilters.background || []}
        onChange={handleBackgroundChange}
        traitCounts={traitCounts}
          icon={
          <Image
              src="/icons/nft-sidebar-categories/background-blue.svg"
              alt="Background"
              width={18}
              height={18}
              className="text-blue-400"
            />
          }
        />

      <FilterSection
          title="Skin Tone"
          color="amber"
          options={traitCounts["skinTone"] ? Object.keys(traitCounts["skinTone"]).sort().map(value => ({ value, display: value })) : FALLBACK_OPTIONS.skinTone.map(value => ({ value, display: value }))}
          selected={selectedFilters.skinTone || []}
        onChange={handleSkinToneChange}
          traitCounts={traitCounts}
        icon={
          <Image src="/icons/nft-sidebar-categories/skin-tone-yellow.svg" alt="Skin Tone" width={18} height={18} className="text-amber-400" sizes="18px" />
        }
        />

      <FilterSection
          title="Shirt"
          color="red"
          options={traitCounts["shirt"] ? Object.keys(traitCounts["shirt"]).sort().map(value => ({ value, display: value })) : FALLBACK_OPTIONS.shirt.map(value => ({ value, display: value }))}
          selected={selectedFilters.shirt || []}
        onChange={handleShirtChange}
          traitCounts={traitCounts}
        icon={<Image src="/icons/nft-sidebar-categories/shirt-red.svg" alt="Shirt" width={18} height={18} className="text-red-400" sizes="18px" />}
        />

      <SubcategorySection
          title="Hair"
          color="green"
        subcategories={FALLBACK_OPTIONS.hair}
          selected={selectedFilters.hair || {}}
        onChange={handleHairChange}
          traitCounts={traitCounts}
        icon={<Image src="/icons/nft-sidebar-categories/hair-green.svg" alt="Hair" width={18} height={18} className="text-green-400" sizes="18px" />}
        />

      <FilterSection
          title="Eyewear"
          color="cyan"
        options={traitCounts["eyewear"] ? Object.keys(traitCounts["eyewear"]).sort().map(value => ({ value, display: formatEyewearDisplay(value) })) : FALLBACK_OPTIONS.eyewear.map(value => ({
          value,
          display: formatEyewearDisplay(value)
        }))}
          selected={selectedFilters.eyewear || []}
        onChange={handleEyewearChange}
          traitCounts={traitCounts}
        icon={<Image src="/icons/nft-sidebar-categories/eyewear-blue.svg" alt="Eyewear" width={18} height={18} className="text-cyan-400" sizes="18px" />}
        />

      <SubcategorySection
          title="Headwear"
          color="purple"
        subcategories={FALLBACK_OPTIONS.headwear}
        selected={selectedFilters.headwear || {}}
        onChange={handleHeadwearChange}
        traitCounts={traitCounts}
          icon={
          <Image src="/icons/nft-sidebar-categories/headwear-purple.svg" alt="Headwear" width={18} height={18} className="text-purple-400" sizes="18px" />
        }
      />
    </div>
  )
}
