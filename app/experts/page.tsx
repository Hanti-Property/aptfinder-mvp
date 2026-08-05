'use client'

export default function ExpertsPage() {
  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto">
      <header className="bg-[#1B3A5C] text-white p-5 text-center">
        <h1 className="text-xl font-bold">AptFinder 전문가 네트워크</h1>
        <p className="text-sm opacity-80 mt-1">강남 부동산, 최고의 전문가와 함께</p>
      </header>

      <div className="p-4 space-y-6">

        {/* 운영자 소개 */}
        <section>
          <h2 className="text-base font-bold text-[#1B3A5C] mb-3 pb-1 border-b-2 border-[#C49A3C]">운영자</h2>
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 bg-[#1B3A5C] rounded-full flex items-center justify-center text-[#C49A3C] text-xl font-bold border-2 border-[#C49A3C]">홍</div>
              <div>
                <p style={{color:'#111827'}} className="text-lg font-bold">홍성욱 대표</p>
                <p className="text-sm text-gray-500">AptFinder 운영자</p>
              </div>
            </div>
            <p className="text-sm text-[#1B3A5C] font-semibold italic">&quot;강남 부동산서비스 및 글로벌 비즈니스 30년&quot;</p>
          </div>
        </section>

        {/* 상담 CTA */}
        <div className="bg-[#1B3A5C] p-5 rounded-lg text-center">
          <p className="text-lg font-bold text-white mb-1">💬 전문가에게 상담 받으세요</p>
          <p className="text-sm text-gray-300 mb-3">매매·전세·재건축·세금·대출 무엇이든</p>
          <a href="/inquiry" className="inline-block px-8 py-3 bg-white text-[#1B3A5C] rounded-lg text-base font-bold">상담 신청하기</a>
        </div>

        <a href="/" className="block text-center text-sm text-gray-500 underline">← 홈으로</a>
      </div>
    </div>
  )
}
