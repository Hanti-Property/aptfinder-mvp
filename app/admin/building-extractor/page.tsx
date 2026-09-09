'use client'

export default function BuildingExtractorPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="bg-[#1B3A5C] border-b border-[#12324a] px-4 py-2 flex items-center justify-between shrink-0">
        <a href="/admin" className="text-gray-300 hover:text-white text-xs">← 대시보드</a>
        <span className="text-white text-sm font-semibold">단지 동별 좌표 추출기 (V-World)</span>
        <span className="text-[10px] bg-[#e74c3c] text-white px-2 py-0.5 rounded font-semibold">ADMIN ONLY</span>
      </div>
      <iframe
        src="/heatmap/building_extractor.html"
        className="flex-1 w-full border-0"
        title="단지 동별 좌표 추출기"
        allow="geolocation"
      />
    </div>
  )
}
