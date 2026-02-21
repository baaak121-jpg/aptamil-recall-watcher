// test-ocr-extraction.ts
// 현재 OCR 추출 결과 확인

import { extractTextFromImage } from './src/llm';
import { extractDates } from './src/parser';
import { parseOcrProducts } from './src/matcher';

async function testOcrExtraction() {
  console.log('=== 실제 웹사이트 이미지 OCR 테스트 ===\n');
  
  const imageUrl = 'https://www.nutriciastore.co.kr/data/editor/board/2502/f9e1f9b9c4d4c1e4c2a6f9e1f9b9c4d4_1739149426_0.png';
  
  console.log('🔄 OCR 실행 중...\n');
  const ocrText = await extractTextFromImage(imageUrl);
  
  console.log('=== OCR 원본 결과 ===');
  console.log(ocrText);
  console.log('\n' + '='.repeat(80) + '\n');
  
  // 제품별 파싱
  const products = parseOcrProducts(ocrText);
  console.log(`=== 파싱된 제품 (${products.length}개) ===`);
  products.forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.koreanName}`);
    console.log(`   영어 키: ${p.englishKey || '(매칭 실패)'}`);
    console.log(`   MHD 개수: ${p.mhdList.length}`);
    console.log(`   MHD: ${p.mhdList.join(', ')}`);
  });
  
  // 전체 날짜 추출
  const allDates = extractDates(ocrText);
  console.log(`\n\n=== 전체 추출된 MHD (${allDates.length}개) ===`);
  allDates.forEach((date, idx) => {
    console.log(`${idx + 1}. ${date}`);
  });
  
  // 기대하는 18개 MHD
  console.log('\n\n=== 기대하는 MHD (18개) ===');
  const expectedMhds = [
    // PRE
    '17-12-2026', '15-03-2027', '22-04-2027', '01-06-2027', '22-07-2027', '07-09-2027', '15-09-2027',
    // 1단계
    '21-04-2027', '01-06-2027', '21-07-2027', '07-09-2027', '16-09-2027',
    // 2단계
    '19-01-2027', '16-02-2027', '17-04-2027', '08-06-2027', '27-06-2027', '20-07-2027'
  ];
  
  expectedMhds.forEach((mhd, idx) => {
    const found = allDates.includes(mhd);
    console.log(`${idx + 1}. ${mhd} ${found ? '✅' : '❌ 누락'}`);
  });
  
  // 누락된 MHD 찾기
  const missing = expectedMhds.filter(mhd => !allDates.includes(mhd));
  if (missing.length > 0) {
    console.log(`\n\n⚠️ 누락된 MHD (${missing.length}개):`);
    missing.forEach(mhd => console.log(`  - ${mhd}`));
  }
  
  // 중복 확인
  const uniqueDates = [...new Set(allDates)];
  if (uniqueDates.length !== allDates.length) {
    console.log(`\n\n⚠️ 중복된 날짜: ${allDates.length - uniqueDates.length}개`);
  }
}

testOcrExtraction().catch(console.error);
