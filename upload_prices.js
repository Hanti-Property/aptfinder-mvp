const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ocfrymsoxqhzzfytdsqr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZnJ5bXNveHFoenpmeXRkc3FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NzUxNTksImV4cCI6MjEwMTM1MTE1OX0._WAikvSuFjwuSPygNYHd8agTgTGGdVzGyTz4YO1ME3k'
);

async function upload() {
  const filePath = 'C:\\aptfinder\\data_utf8.txt';
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.toString().split('\n').filter(l => l.trim());
  
  console.log(`총 ${lines.length}줄 읽음`);

  const rows = [];
  for (const line of lines) {
    const cols = line.split('|');
    if (cols.length < 20) continue;
    
    // Y가 있는 위치를 찾아서 공시가격은 그 바로 앞
    let priceIdx = -1;
    for (let i = cols.length - 1; i >= 0; i--) {
      if (cols[i] === 'Y' || cols[i] === 'N') {
        priceIdx = i - 1;
        break;
      }
    }
    if (priceIdx < 0) continue;
    
    // Y 바로 앞에서 역순: 공시가격, 전용면적, 호수(전체), 호(층내), 층, 동
    const price = parseInt(cols[priceIdx]);
    if (!price || price < 10000000) continue;
    
    const exclusiveArea = parseFloat(cols[priceIdx - 1]);
    const unitNo = cols[priceIdx - 2] || '';      // 전체 호수 (106, 1205)
    const floor = cols[priceIdx - 4] || '';        // 층
    const buildingNo = cols[priceIdx - 5] || '';   // 동
    
    // 단지명: 빈값이 아닌 한글 문자열 찾기 (위치 15~17 사이)
    let complexName = '';
    for (let i = 14; i <= 17; i++) {
      if (cols[i] && /[가-힣]/.test(cols[i]) && cols[i].length >= 2) {
        complexName = cols[i];
        break;
      }
    }
    
    const row = {
      road_address: cols[6] || '',
      bjdong: cols[9] || '',
      building_no: cols[priceIdx - 4] || '',
      complex_name: complexName,
      unit_no: unitNo,
      exclusive_area: exclusiveArea || null,
      price: price,
      dong: cols[9] || ''
    };
    
    if (row.price && row.complex_name) {
      rows.push(row);
    }
  }

  console.log(`유효 데이터: ${rows.length}건`);

  // 500건씩 배치 업로드
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase.from('public_prices').insert(batch);
    if (error) {
      console.log(`에러 (${i}~${i+500}):`, error.message);
    } else {
      console.log(`업로드 완료: ${i + batch.length}/${rows.length}`);
    }
  }

  console.log('완료!');
}

upload();
