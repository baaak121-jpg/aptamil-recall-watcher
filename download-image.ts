// 이미지 다운로드
import { writeFileSync } from 'fs';

async function downloadImage() {
  const imageUrl = 'https://nutriciaeibe12.cdn-nhncommerce.com/data/editor/board/260213/77241fb7ee3e526c61dfe2c4d76032df_175437.png';
  
  console.log('📥 이미지 다운로드 중...');
  
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; AptamilRecallWatcher/1.0)',
    },
  });
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  writeFileSync('actual-kr-image.png', buffer);
  
  console.log(`✅ 다운로드 완료: actual-kr-image.png (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

downloadImage().catch(console.error);
