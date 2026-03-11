import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  className?: string
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  className,
}: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100

  return (
    <div className={cn("relative flex w-full touch-none select-none items-center", className)}>
      <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-bg-primary border border-border-color/50">
        <div
          className="absolute h-full bg-[#00F0FF]/50"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([Number(e.target.value)])}
        className="absolute w-full h-2 opacity-0 cursor-pointer"
      />
      <div
        className="absolute h-4 w-4 rounded-full border-2 border-[#00F0FF] bg-bg-secondary shadow-lg"
        style={{ 
          left: `calc(${percentage}% - 8px)`,
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}
