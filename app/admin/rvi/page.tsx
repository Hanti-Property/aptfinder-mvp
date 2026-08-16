'use client'

export default function AdminRviPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-[#1B3A5C] text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-white/70 hover:text-white text-sm">← 대시보드</a>
          <h1 className="text-lg font-semibold">🏗️ 재건축 RVI 대시보드</h1>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded">ADMIN ONLY</span>
      </header>
      <iframe
        src="/_internal_rvi.html"
        className="flex-1 w-full border-0"
        title="재건축 RVI 대시보드"
        allow="geolocation"
      />
    </div>
  )
}
