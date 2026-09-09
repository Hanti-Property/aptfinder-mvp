'use client'

export default function AcademyHeatmapPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#1B3A5C] border-b border-[#12324a] px-4 py-2 flex items-center justify-between shrink-0">
        <a href="/admin" className="text-gray-300 hover:text-white text-xs">← 대시보드</a>
        <span className="text-white text-sm font-semibold">학원 매물 히트맵</span>
        <span className="text-[10px] bg-[#e74c3c] text-white px-2 py-0.5 rounded font-semibold">ADMIN ONLY</span>
      </div>
      <iframe
        src="/heatmap/academy_heatmap.html"
        className="flex-1 w-full border-0"
        title="학원 매물 히트맵"
        allow="geolocation"
      />
    </div>
  )
}
