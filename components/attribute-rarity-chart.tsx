// components/attribute-rarity-chart.tsx
"use client"

import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { colors } from "@/lib/design-system"

// Consistent color scheme using design system
const COLORS = {
  background: colors.filter.blue,
  skinTone: colors.filter.yellow,
  shirt: colors.filter.red,
  hair: colors.filter.green,
  eyewear: colors.filter.cyan,
  headwear: colors.filter.violet,
  neutral: colors.filter.neutral,
};

interface AttributeRarityProps {
  attributes: {
    name: string
    value: string
    percentage: number
  }[]
  overallRarity?: string | number
}

export default function AttributeRarityChart({ attributes, overallRarity }: AttributeRarityProps) {
  
  
  
  try {
    const getColorForAttribute = (attributeName: string) => {
    const colorMap: { [key: string]: string } = {
      "Background": COLORS.background,
      "Skin Tone": COLORS.skinTone,
      "Shirt": COLORS.shirt,
      "Hair": COLORS.hair,
      "Eyewear": COLORS.eyewear,
      "Headwear": COLORS.headwear,
    }
    return colorMap[attributeName] || COLORS.neutral
  }

  const chartData = attributes.map((attr) => ({
    name: attr.name,
    value: attr.value,
    percentage: attr.percentage,
    fill: getColorForAttribute(attr.name),
  }));

  // If no attributes, show a message
  if (!attributes || attributes.length === 0) {
    return (
      <Card className="flex flex-col bg-neutral-800 border-neutral-700 mb-4 rounded-sm">
        <CardContent className="flex-1 pb-4">
          <div className="flex items-center justify-center h-[200px] text-neutral-400">
            No attributes available for rarity distribution
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartConfig = attributes.reduce((config, attr) => {
    const key = attr.name.toLowerCase().replace(/\s+/g, '')
    config[key] = {
      label: attr.name,
      color: getColorForAttribute(attr.name),
    }
    return config
  }, {} as ChartConfig)

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square w-full h-[300px] relative"
    >
      <PieChart
        width={300}
        height={300}
      >
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent
            hideLabel
            className="bg-neutral-900 border-neutral-600 text-off-white"
            formatter={(value, name) => {
              const item = chartData.find(d => d.name === name);
              return [
                <span key={name} className="text-off-white font-medium">
                  {name}: {item?.value} ({value}%)
                </span>,
                ""
              ];
            }}
          />}
        />
        <Pie
          data={chartData}
          dataKey="percentage"
          nameKey="name"
          innerRadius={80}
          outerRadius={140}
          strokeWidth={2}
          stroke={colors.background.stroke}
          animationBegin={0}
          animationDuration={1200}
          animationEasing="ease-out"
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 8}
                      className="fill-neutral-100 text-2xl font-bold"
                    >
                      {overallRarity}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 18}
                      className="fill-neutral-400 text-sm"
                    >
                      Rarity
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
  } catch (error) {
    return (
      <Card className="flex flex-col bg-neutral-800 border-neutral-700 mb-4 rounded-sm">
        <CardContent className="flex-1 pb-4">
          <div className="flex items-center justify-center h-[200px] text-red-400">
            Error loading rarity chart: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }
}

