"use client"

import * as React from "react"

export function SecurityChart() {
  const data = [
    { label: "00:00", requests: 120, blocks: 2 },
    { label: "04:00", requests: 80, blocks: 1 },
    { label: "08:00", requests: 250, blocks: 5 },
    { label: "12:00", requests: 480, blocks: 12 },
    { label: "16:00", requests: 380, blocks: 8 },
    { label: "20:00", requests: 520, blocks: 18 },
    { label: "24:00", requests: 300, blocks: 4 },
  ]

  const maxVal = 600
  const width = 500
  const height = 180

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - (d.requests / maxVal) * height
      return `${x},${y}`
    })
    .join(" ")

  const fillPoints = `0,${height} ${points} ${width},${height}`

  const blockPoints = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((d.blocks * 20) / maxVal) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <div className="rounded-xl border border-border bg-card/30 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Tráfego & Segurança</h3>
          <p className="text-xs text-muted-foreground">Requisições vs Ataques bloqueados nas últimas 24h</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Requisições</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Bloqueios</span>
          </div>
        </div>
      </div>
      <div className="relative h-[180px] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="0" y1={height / 3} x2={width} y2={height / 3} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="0" y1={(height * 2) / 3} x2={width} y2={(height * 2) / 3} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4 4" />

          {/* Requests Area & Line */}
          <polygon points={fillPoints} fill="url(#reqGrad)" />
          <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Blocks Line */}
          <polyline points={blockPoints} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" />

          {/* Data Points */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * width
            const yReq = height - (d.requests / maxVal) * height
            const yBlk = height - ((d.blocks * 20) / maxVal) * height

            return (
              <g key={i}>
                <circle cx={x} cy={yReq} r="4" fill="var(--background)" stroke="#10b981" strokeWidth="2" className="cursor-pointer transition-transform hover:scale-150" />
                <circle cx={x} cy={yBlk} r="3" fill="var(--background)" stroke="#ef4444" strokeWidth="2" />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}
