// components/ui/chart.tsx
"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"]
  }
>(({ id, className, children, config, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "Chart"

/**
 * SECURITY: Sanitize string for use in CSS selector
 * STRICT: Only allows alphanumeric, hyphens, underscores, and dots
 * Removes ALL special characters that could break CSS syntax or enable injection
 */
function sanitizeCssSelector(str: string): string {
  if (!str || typeof str !== 'string') return 'chart-default'
  // STRICT: Only allow alphanumeric, hyphens, underscores, dots
  // Remove EVERYTHING else - no exceptions
  const sanitized = str.replace(/[^a-zA-Z0-9._-]/g, '').replace(/^\.+|\.+$/g, '')
  // Ensure it's not empty and doesn't start with a number
  if (!sanitized || /^\d/.test(sanitized)) return 'chart-default'
  // Limit length to prevent DoS
  return sanitized.slice(0, 100)
}

/**
 * SECURITY: Sanitize string for use as CSS variable name
 * STRICT: Only allows alphanumeric, hyphens, and underscores
 * Must start with letter or underscore (CSS variable requirement)
 */
function sanitizeCssVariableName(str: string): string {
  if (!str || typeof str !== 'string') return ''
  // STRICT: Only allow alphanumeric, hyphens, underscores
  let sanitized = str.replace(/[^a-zA-Z0-9_-]/g, '')
  // Remove leading/trailing hyphens
  sanitized = sanitized.replace(/^-+|-+$/g, '')
  // Must start with letter or underscore (CSS variable requirement)
  if (!sanitized || /^\d/.test(sanitized)) {
    sanitized = '_' + sanitized
  }
  // Limit length to prevent DoS
  return sanitized.slice(0, 50)
}

/**
 * SECURITY: Validate and sanitize CSS color value
 * STRICT: Only allows whitelisted CSS color formats
 * Rejects anything that doesn't match exact patterns
 */
function sanitizeCssColor(color: string | undefined): string | null {
  if (!color || typeof color !== 'string') return null
  
  // STRICT: Remove ALL potentially dangerous characters first
  const sanitized = color.trim().replace(/[<>{}[\]();'":\\\/\s]/g, '')
  
  // STRICT: Only allow exact patterns - no exceptions
  // Hex: #rrggbb or #rgb (exact match)
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
  // RGB/RGBA: rgb(...) or rgba(...) with strict number validation
  const rgbPattern = /^rgba?\(\d+,\d+,\d+(,0?\.?\d+)?\)$/
  // HSL/HSLA: hsl(...) or hsla(...) with strict validation
  const hslPattern = /^hsla?\(\d+,\d+%,\d+%(,0?\.?\d+)?\)$/
  // STRICT whitelist of safe named colors only
  const namedColors = [
    'transparent', 'currentColor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta'
  ]
  
  // STRICT: Must match exact pattern - no partial matches
  if (hexPattern.test(sanitized)) {
    return sanitized // Hex colors are safe
  }
  
  if (rgbPattern.test(sanitized)) {
    // Additional validation: ensure numbers are in valid ranges
    const match = sanitized.match(/rgba?\((\d+),(\d+),(\d+)(,([\d.]+))?\)/)
    if (match) {
      const r = parseInt(match[1], 10)
      const g = parseInt(match[2], 10)
      const b = parseInt(match[3], 10)
      const a = match[5] ? parseFloat(match[5]) : 1
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && a >= 0 && a <= 1) {
        return sanitized
      }
    }
    return null
  }
  
  if (hslPattern.test(sanitized)) {
    // Additional validation: ensure numbers are in valid ranges
    const match = sanitized.match(/hsla?\((\d+),(\d+)%,(\d+)%(,([\d.]+))?\)/)
    if (match) {
      const h = parseInt(match[1], 10)
      const s = parseInt(match[2], 10)
      const l = parseInt(match[3], 10)
      const a = match[5] ? parseFloat(match[5]) : 1
      if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100 && a >= 0 && a <= 1) {
        return sanitized
      }
    }
    return null
  }
  
  if (namedColors.includes(sanitized.toLowerCase())) {
    return sanitized.toLowerCase()
  }
  
  // STRICT: If it doesn't match any pattern exactly, reject it
  return null
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([_unused, config]) => config.theme || config.color // eslint-disable-line @typescript-eslint/no-unused-vars
  )

  if (!colorConfig.length) {
    return null
  }

  // SECURITY: Sanitize all user-controlled inputs before inserting into CSS
  // 1. Sanitize the `id` to prevent CSS selector injection
  // 2. Sanitize the `key` to prevent CSS variable name injection
  // 3. Validate and sanitize `color` values to prevent CSS injection
  const sanitizedId = sanitizeCssSelector(id)

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) =>
              `
${prefix} [data-chart="${sanitizedId}"] {
${colorConfig
  .map(([key, itemConfig]) => {
    // Sanitize the key (CSS variable name)
    const sanitizedKey = sanitizeCssVariableName(key)
    if (!sanitizedKey) return null
    
    // Get and sanitize the color value
    const rawColor = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    const sanitizedColor = sanitizeCssColor(rawColor)
    
    // Only output if we have a valid color
    return sanitizedColor ? `  --color-${sanitizedKey}: ${sanitizedColor};` : null
  })
  .filter(Boolean)
  .join("\n")}
}
`
          )
          .join(""),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean
      hideIndicator?: boolean
      indicator?: "line" | "dot" | "dashed"
      nameKey?: string
      labelKey?: string
    }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || item.name || "value"}`
      const itemConfig = getPayloadConfigFromPayload(config, item, key)
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label || label
          : itemConfig?.label

      if (labelFormatter) {
        return labelFormatter(label, payload)
      }

      return value
    }, [
      label,
      labelFormatter,
      payload,
      hideLabel,
      labelKey,
      config,
    ])

    if (!active || !payload?.length) {
      return null
    }

    const nestLabel = payload.length === 1 && indicator !== "dot"

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-2 rounded-sm border border-neutral-700/50 bg-background px-3 py-2 text-xs shadow-xl",
          className
        )}
      >
        {!nestLabel ? (
          <div className={cn("font-medium", labelClassName)}>
            {tooltipLabel}
          </div>
        ) : null}
        <div className="grid gap-2">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = getPayloadConfigFromPayload(config, item, key)
            const indicatorColor = color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                              "my-0.5": nestLabel && indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        nestLabel ? "items-end" : "items-center"
                      )}
                    >
                      <div className="grid gap-2">
                        {nestLabel ? (
                          <div className={cn("font-medium", labelClassName)}>
                            {tooltipLabel}
                          </div>
                        ) : null}
                        <div className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </div>
                      </div>
                      {item.value && (
                        <div className="font-mono tabular-nums text-off-white" style={{ fontWeight: 300 }}>
                          {item.value}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-2 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegendContent"

// Helper to extract the key from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined

  const configLabelKey: string = key

  if (
    key in config ||
    (payloadPayload && configLabelKey in payloadPayload)
  ) {
    return config[configLabelKey]
  }

  return config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}

