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
    <div className="border border-[#1e1e24] bg-[#09090b] p-5 rounded-[2px] transition-all duration-300 hover:border-[#00ff88]/30">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#00ff88]">Tráfego & Segurança</h3>
          <p className="text-[10px] text-[#a1a1aa] font-mono">REQUISIÇÕES VS ATAQUES BLOQUEADOS</p>
        </div>
        <div className="flex items-center gap-3 text-[9px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-[#00ff88]" />
            <span className="text-[#a1a1aa] uppercase">Tráfego</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 bg-red-500" />
            <span className="text-[#a1a1aa] uppercase">Bloqueios</span>
          </div>
        </div>
      </div>
      <div className="relative h-[180px] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff88" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00ff88" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="blockGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1="0" y1={height / 3} x2={width} y2={height / 3} stroke="#1e1e24" strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="0" y1={(height * 2) / 3} x2={width} y2={(height * 2) / 3} stroke="#1e1e24" strokeWidth="0.75" strokeDasharray="3 3" />

          <polygon points={fillPoints} fill="url(#reqGrad)" />
          <polyline points={points} fill="none" stroke="#00ff88" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />

          <polyline points={blockPoints} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter" strokeDasharray="2 2" />

          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * width
            const yReq = height - (d.requests / maxVal) * height
            const yBlk = height - ((d.blocks * 20) / maxVal) * height

            return (
              <g key={i}>
                <rect x={x - 2.5} y={yReq - 2.5} width="5" height="5" fill="#050506" stroke="#00ff88" strokeWidth="1.5" className="cursor-pointer transition-transform hover:scale-150" />
                <rect x={x - 2} y={yBlk - 2} width="4" height="4" fill="#050506" stroke="#ef4444" strokeWidth="1" />
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[9px] font-mono text-[#a1a1aa]">
        {data.map((d, i) => (
          <span key={i}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}
