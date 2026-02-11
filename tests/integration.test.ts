// tests/integration.test.ts

import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeHtml, extractDates } from '../src/parser';

describe('Integration Tests', () => {
  describe('Sample Recall HTML', () => {
    let html: string;

    beforeAll(() => {
      html = readFileSync(join(__dirname, 'fixtures', 'sample-recall.html'), 'utf-8');
    });

    it('should normalize HTML and remove scripts', () => {
      const normalized = normalizeHtml(html);
      
      expect(normalized).not.toContain('<script>');
      expect(normalized).not.toContain('console.log');
      expect(normalized).toContain('Wichtige Information');
      expect(normalized).toContain('Rückruf');
    });

    it('should extract all MHD dates from recall notice', () => {
      const normalized = normalizeHtml(html);
      const dates = extractDates(normalized);

      // 예상되는 날짜들
      expect(dates).toContain('15-06-2026');
      expect(dates).toContain('20-07-2026');
      expect(dates).toContain('25-08-2026');
      expect(dates).toContain('11-02-2026'); // Datum: 2026-02-11
    });

    it('should handle multiple date formats', () => {
      const normalized = normalizeHtml(html);
      const dates = extractDates(normalized);

      // DD-MM-YYYY
      expect(dates).toContain('15-06-2026');
      
      // DD.MM.YYYY -> DD-MM-YYYY
      expect(dates).toContain('20-07-2026');
      
      // DD/MM/YYYY -> DD-MM-YYYY
      expect(dates).toContain('25-08-2026');
      
      // YYYY-MM-DD -> DD-MM-YYYY
      expect(dates).toContain('11-02-2026');
    });

    it('should extract product information', () => {
      const normalized = normalizeHtml(html);
      
      expect(normalized).toContain('Aptamil Pronutra PRE');
      expect(normalized).toContain('800g');
      expect(normalized).toContain('LOT: L123456789');
    });
  });

  describe('Empty or Invalid HTML', () => {
    it('should handle empty HTML', () => {
      const normalized = normalizeHtml('');
      expect(normalized).toBe('');
      
      const dates = extractDates(normalized);
      expect(dates).toEqual([]);
    });

    it('should handle HTML with no dates', () => {
      const html = '<html><body><p>No dates here</p></body></html>';
      const normalized = normalizeHtml(html);
      const dates = extractDates(normalized);
      
      expect(dates).toEqual([]);
    });

    it('should handle malformed HTML', () => {
      const html = '<html><body><p>Unclosed tag';
      const normalized = normalizeHtml(html);
      
      expect(normalized).toContain('Unclosed tag');
    });
  });
});
