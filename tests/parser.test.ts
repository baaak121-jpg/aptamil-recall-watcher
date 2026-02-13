// tests/parser.test.ts

import { normalizeHtml, extractDates, parseUserDate, isValidDate } from '../src/parser';

describe('Parser', () => {
  describe('normalizeHtml', () => {
    it('should remove scripts and styles', () => {
      const html = `
        <html>
          <head><style>body { color: red; }</style></head>
          <body>
            <script>alert('test');</script>
            <p>Hello World</p>
          </body>
        </html>
      `;
      const result = normalizeHtml(html);
      expect(result).not.toContain('alert');
      expect(result).not.toContain('color: red');
      expect(result).toContain('Hello World');
    });

    it('should normalize whitespace', () => {
      const html = '<p>Hello    \n\n   World</p>';
      const result = normalizeHtml(html);
      expect(result).toBe('Hello World');
    });
  });

  describe('extractDates', () => {
    it('should extract DD-MM-YYYY dates', () => {
      const text = 'Recall for products with MHD 15-06-2026 and 20-07-2026.';
      const dates = extractDates(text);
      expect(dates).toContain('15-06-2026');
      expect(dates).toContain('20-07-2026');
    });

    it('should extract DD.MM.YYYY dates', () => {
      const text = 'MHD: 15.06.2026';
      const dates = extractDates(text);
      expect(dates).toContain('15-06-2026');
    });

    it('should extract DD/MM/YYYY dates', () => {
      const text = 'Expiry: 15/06/2026';
      const dates = extractDates(text);
      expect(dates).toContain('15-06-2026');
    });

    it('should handle YYYY-MM-DD format', () => {
      const text = 'Date: 2026-06-15';
      const dates = extractDates(text);
      expect(dates).toContain('15-06-2026');
    });

    it('should filter invalid dates', () => {
      const text = 'Invalid: 99-99-9999, Valid: 15-06-2026';
      const dates = extractDates(text);
      expect(dates).not.toContain('99-99-9999');
      expect(dates).toContain('15-06-2026');
    });

    it('should return empty array for no dates', () => {
      const text = 'No dates here';
      const dates = extractDates(text);
      expect(dates).toEqual([]);
    });
  });

  describe('parseUserDate', () => {
    it('should parse valid DD-MM-YYYY', () => {
      expect(parseUserDate('15-06-2026')).toBe('15-06-2026');
    });

    it('should reject invalid format', () => {
      expect(parseUserDate('15/06/2026')).toBeNull();
      expect(parseUserDate('2026-06-15')).toBeNull();
      expect(parseUserDate('15-6-2026')).toBeNull();
    });

    it('should reject invalid dates', () => {
      expect(parseUserDate('32-01-2026')).toBeNull();
      expect(parseUserDate('15-13-2026')).toBeNull();
    });
  });

  describe('isValidDate', () => {
    it('should validate correct dates', () => {
      expect(isValidDate('15-06-2026')).toBe(true);
      expect(isValidDate('29-02-2024')).toBe(true); // leap year
    });

    it('should reject invalid dates', () => {
      expect(isValidDate('32-01-2026')).toBe(false);
      expect(isValidDate('15-13-2026')).toBe(false);
      expect(isValidDate('00-01-2026')).toBe(false);
    });
  });
});
