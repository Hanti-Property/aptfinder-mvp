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
                <p className="text-sm text-gray-500">AptFinder 운영자 · 공인중개사</p>
              </div>
            </div>
            <p className="text-sm text-[#1B3A5C] font-semibold italic mb-2">&quot;강남 부동산서비스 및 글로벌 비즈니스 30년&quot;</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              대치동 20년+ 실거주 · 은마아파트 재건축 조합원 · 강남 재건축·학군 전문
            </p>
          </div>
        </section>

        {/* 파트너 중개사 */}
        <section>
          <h2 className="text-base font-bold text-[#1B3A5C] mb-3 pb-1 border-b-2 border-[#C49A3C]">🏢 파트너 중개사</h2>
          <div className="space-y-2">
            {[
              {initial:'김', name:'김OO 대표', office:'강남공인중개사무소', area:'강남구 테헤란로', listings:12},
              {initial:'박', name:'박OO 대표', office:'대치에셋공인중개', area:'강남구 삼성로', listings:8},
              {initial:'이', name:'이OO 대표', office:'개포프라임공인중개', area:'강남구 개포로', listings:5},
            ].map((p, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <div className="w-11 h-11 bg-[#1B3A5C] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{p.initial}</div>
                <div>
                  <p style={{color:'#111827'}} className="text-sm font-bold">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.office}</p>
                  <p className="text-xs text-gray-400">{p.area} · 등록매물 {p.listings}건</p>
                  <p className="text-xs text-[#C49A3C]">상담 가능</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center mt-2">파트너 중개사 모집 중 →</p>
          </div>
        </section>

        {/* 전문가 파트너 */}
        <section>
          <h2 className="text-base font-bold text-[#1B3A5C] mb-3 pb-1 border-b-2 border-[#C49A3C]">👔 전문가 파트너</h2>
          <div className="space-y-2">
            {[
              {field:'세무', name:'정OO 세무사', desc:'OO세무법인 · 강남 양도세/증여세 전문', note:'상담 가능 · 칼럼 3건 기고'},
              {field:'법무', name:'최OO 법무사', desc:'OO법무법인 · 등기/상속/증여 전문', note:'상담 가능 · 칼럼 2건 기고'},
              {field:'대출', name:'한OO 대출전문가', desc:'OO은행 강남지점 · 주담대/재건축이주비 전문', note:'상담 가능'},
              {field:'감정', name:'윤OO 감정평가사', desc:'OO감정평가법인 · 강남 아파트 시세평가 전문', note:'상담 가능'},
            ].map((e, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                <div className="w-11 h-11 bg-[#C49A3C] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{e.field}</div>
                <div>
                  <p style={{color:'#111827'}} className="text-sm font-bold">{e.name}</p>
                  <p className="text-xs text-gray-500">{e.desc}</p>
                  <p className="text-xs text-[#C49A3C]">{e.note}</p>
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-400 text-center mt-2">전문가 파트너 모집 중 →</p>
          </div>
        </section>

        {/* 상담 CTA */}
        <div className="bg-[#1B3A5C] p-5 rounded-lg text-center">
          <p className="text-lg font-bold text-white mb-1">💬 전문가에게 상담 받으세요</p>
          <p className="text-sm text-gray-300 mb-3">매매·전세·재건축·세금·대출 무엇이든</p>
          <a href="/inquiry" className="inline-block px-8 py-3 bg-white text-[#1B3A5C] rounded-lg text-base font-bold">상담 신청하기</a>
        </div>

        {/* 파트너 신청 */}
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">전문가 네트워크에 참여하시겠습니까?</p>
          <a href="/inquiry" className="inline-block px-6 py-2.5 bg-gray-100 text-[#1B3A5C] rounded-lg text-sm font-semibold">파트너 신청하기</a>
        </div>

        <a href="/" className="block text-center text-sm text-gray-500 underline">← 홈으로</a>
      </div>
    </div>
  )
}
