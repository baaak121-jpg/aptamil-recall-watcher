// tests/scanner.test.ts

import { scanSource } from '../src/scanner';
import { Source, RegisteredItem } from '../src/types';

// Mock fetch
global.fetch = jest.fn();

// Mock store
jest.mock('../src/store', () => ({
  updateSource: jest.fn(),
  addNoticeSnapshot: jest.fn(),
}));

// Mock llm
jest.mock('../src/llm', () => ({
  extractTextFromImages: jest.fn().mockResolvedValue(['Mocked OCR text']),
  generateSummary: jest.fn().mockResolvedValue('Mocked summary'),
}));

describe('Scanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should detect changes when hash differs', async () => {
    const source: Source = {
      source_key: 'test_source',
      country_code: 'DE',
      tier: 1,
      url: 'https://example.com',
      parse_strategy: 'HTML_TEXT',
      reliability_label: 'Official',
      last_hash: 'old_hash',
      last_checked_at: null,
    };

    const html = `
      <html>
        <body>
          <p>Recall notice for MHD 15-06-2026</p>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => html,
    });

    const items: RegisteredItem[] = [
      {
        id: '1',
        model_key: 'pronutra_pre',
        model_label: 'Aptamil Pronutra PRE',
        mhd: '15-06-2026',
        created_at: new Date().toISOString(),
      },
    ];

    const result = await scanSource(source, items);

    expect(result.changed).toBe(true);
    expect(result.country_code).toBe('DE');
    expect(result.tier).toBe(1);
    expect(result.extracted_dates).toContain('15-06-2026');
    expect(result.matched_items).toHaveLength(1);
    expect(result.matched_items[0].mhd).toBe('15-06-2026');
  });

  it('should handle fetch errors gracefully', async () => {
    const source: Source = {
      source_key: 'test_source',
      country_code: 'UK',
      tier: 1,
      url: 'https://example.com',
      parse_strategy: 'HTML_TEXT',
      reliability_label: 'Regulator',
      last_hash: null,
      last_checked_at: null,
    };

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await scanSource(source, []);

    expect(result.changed).toBe(false);
    expect(result.error).toContain('Network error');
    expect(result.extracted_dates).toEqual([]);
  });

  it('should not match when MHD differs', async () => {
    const source: Source = {
      source_key: 'test_source',
      country_code: 'IE',
      tier: 1,
      url: 'https://example.com',
      parse_strategy: 'TABLE_DATES',
      reliability_label: 'Regulator',
      last_hash: 'old_hash',
      last_checked_at: null,
    };

    const html = `
      <html>
        <body>
          <p>Recall notice for MHD 20-07-2026</p>
        </body>
      </html>
    `;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => html,
    });

    const items: RegisteredItem[] = [
      {
        id: '1',
        model_key: 'pronutra_pre',
        model_label: 'Aptamil Pronutra PRE',
        mhd: '15-06-2026', // Different MHD
        created_at: new Date().toISOString(),
      },
    ];

    const result = await scanSource(source, items);

    expect(result.changed).toBe(true);
    expect(result.extracted_dates).toContain('20-07-2026');
    expect(result.matched_items).toHaveLength(0);
  });
});
