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
    if (cols.length < 23) continue;
    
    const row = {
      road_address: cols[6] || '',
      bjdong: cols[9] || '',
      building_no: cols[13] || '',
      complex_name: cols[16] || '',
      unit_no: cols[20] || '',
      exclusive_area: parseFloat(cols[21]) || null,
      price: parseInt(cols[22]) || null,
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
