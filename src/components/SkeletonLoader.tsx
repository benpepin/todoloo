'use client'

interface SkeletonLoaderProps {
  count?: number
}

export default function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
  return (
    <div className="w-full flex flex-col justify-start items-start">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`w-full max-w-[520px] shadow-[2px_2px_4px_rgba(0,0,0,0.15)] rounded-[20px] p-5 md:p-6 ${
            index === 0 ? '' : 'mt-4'
          }`}
          style={{
            backgroundColor: 'var(--color-todoloo-task)'
          }}
        >
          <div className="flex items-center gap-6">
            {/* Task number circle - desktop only */}
            <div className="hidden lg:flex items-center justify-center w-[32px] h-[32px]">
              <div
                className="w-[32px] h-[32px] rounded-full skeleton-shimmer"
                style={{
                  opacity: 0.3
                }}
              />
            </div>

            {/* Task content */}
            <div className="flex-1 flex flex-col gap-2">
              {/* Description bar */}
              <div
                className="w-full h-[18px] rounded skeleton-shimmer"
                style={{
                  opacity: 0.3
                }}
              />
              {/* Time estimate bar */}
              <div
                className="w-[120px] h-[14px] rounded skeleton-shimmer"
                style={{
                  opacity: 0.3
                }}
              />
            </div>

            {/* Checkbox circle */}
            <div className="flex items-center justify-center w-[24px] lg:w-[32px] h-[32px]">
              <div
                className="w-[24px] h-[24px] lg:w-[32px] lg:h-[32px] rounded-full border-2 skeleton-shimmer"
                style={{
                  opacity: 0.3,
                  borderColor: 'var(--color-todoloo-border)'
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
