// api/health.ts
// 마지막 크론 실행 시간 확인용

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSources } from '../src/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sources = await getSources();
    const krSource = sources.find(s => s.source_key === 'nutricia_kr_aptamil_program');
    
    if (!krSource) {
      return res.json({
        message: 'No source found',
        lastRun: null,
      });
    }
    
    const lastChecked = krSource.last_checked_at;
    const lastHash = krSource.last_hash;
    
    let timeSinceLastRun = null;
    let lastRunKST = null;
    
    if (lastChecked) {
      const lastRunTime = new Date(lastChecked);
      timeSinceLastRun = Date.now() - lastRunTime.getTime();
      
      // KST로 변환 (UTC+9)
      const kstTime = new Date(lastRunTime.getTime() + (9 * 60 * 60 * 1000));
      lastRunKST = kstTime.toISOString().replace('T', ' ').substring(0, 19) + ' KST';
    }
    
    return res.json({
      lastRun: lastChecked,
      lastRunKST,
      minutesAgo: timeSinceLastRun ? Math.floor(timeSinceLastRun / 1000 / 60) : null,
      lastHash: lastHash ? lastHash.substring(0, 10) + '...' : null,
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  }
}
