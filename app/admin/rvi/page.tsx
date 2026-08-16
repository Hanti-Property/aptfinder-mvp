'use client'

export default function AdminRviPage() {
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <div className="bg-[#0f0f23] border-b border-[#2a2a4a] px-4 py-2 flex items-center justify-between shrink-0">
        <a href="/admin" className="text-gray-400 hover:text-white text-xs">← 대시보드</a>
        <span className="text-[10px] bg-[#e74c3c] text-white px-2 py-0.5 rounded font-semibold">ADMIN ONLY</span>
      </div>
      <iframe
        src="/_internal_rvi.html"
        className="flex-1 w-full border-0"
        title="재건축 RVI 대시보드"
        allow="geolocation"
      />
    </div>
  )
}
