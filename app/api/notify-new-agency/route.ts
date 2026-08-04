import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { agency } = await request.json()

    const emailBody = `
[AptFinder 신규 부동산 등록 알림]

새로운 부동산이 등록되었습니다.

상호명: ${agency.name}
대표자: ${agency.representative || '-'}
연락처1: ${agency.phone1 || '-'}
연락처2: ${agency.phone2 || '-'}
소재지: ${agency.address || '-'}
등록번호: ${agency.registration_no || '-'}
등록일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}

---
AptFinder 관리자 알림
`

    // Supabase 또는 외부 이메일 서비스로 발송
    // 현재는 콘솔 로그 + 향후 이메일 서비스 연동 예정
    console.log('=== 신규 부동산 등록 알림 ===')
    console.log('수신: stephen.hong@hanti-property.com, hantiproperty@icloud.com')
    console.log(emailBody)

    // TODO: 실제 이메일 발송 (Resend, SendGrid, AWS SES 등 연동 시)
    // await sendEmail({
    //   to: ['stephen.hong@hanti-property.com', 'hantiproperty@icloud.com'],
    //   subject: `[AptFinder] 신규 부동산 등록: ${agency.name}`,
    //   text: emailBody,
    // })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
