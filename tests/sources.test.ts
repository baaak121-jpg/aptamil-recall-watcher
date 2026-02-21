// tests/sources.test.ts

import { SOURCES, getTier1Sources, getSourcesByCountry, getTier1LinksByCountry } from '../src/sources';

describe('Sources', () => {
  describe('SOURCES array', () => {
    it('should have KR source only', () => {
      expect(SOURCES.length).toBe(1);
      expect(SOURCES[0].country_code).toBe('KR');
    });

    it('should have IMAGE_OCR strategy for KR', () => {
      const krSource = SOURCES.find((s) => s.country_code === 'KR');
      expect(krSource).toBeDefined();
      expect(krSource?.parse_strategy).toBe('IMAGE_OCR');
    });

    it('should have valid parse strategies', () => {
      const validStrategies = [
        'HTML_TEXT', 
        'TABLE_DATES', 
        'CHECKER_LINK',
        'URL_CHECK',
        'LIST_ITEMS',
        'SECTION_HASH',
        'CONTENT_KEYWORD',
        'IMAGE_OCR'
      ];
      
      for (const source of SOURCES) {
        expect(validStrategies).toContain(source.parse_strategy);
      }
    });

    it('should have valid reliability labels', () => {
      const validLabels = ['Official', 'Regulator', 'OfficialStore'];
      
      for (const source of SOURCES) {
        expect(validLabels).toContain(source.reliability_label);
      }
    });

    it('should have valid URLs', () => {
      for (const source of SOURCES) {
        expect(source.url).toMatch(/^https?:\/\//);
      }
    });

    it('should have unique source keys', () => {
      const keys = SOURCES.map((s) => s.source_key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should have non-empty notes', () => {
      for (const source of SOURCES) {
        expect(source.notes).toBeTruthy();
        expect(source.notes?.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getTier1Sources', () => {
    it('should have 1 Tier 1 source (KR only)', () => {
      const tier1 = getTier1Sources();
      expect(tier1.length).toBe(1);
      expect(tier1[0].country_code).toBe('KR');
    });
  });

  describe('getSourcesByCountry', () => {
    it('should return sources for KR', () => {
      const krSources = getSourcesByCountry('KR');
      expect(krSources.length).toBe(1);
      expect(krSources[0].country_code).toBe('KR');
    });

    it('should return empty array for other countries', () => {
      expect(getSourcesByCountry('DE')).toEqual([]);
      expect(getSourcesByCountry('UK')).toEqual([]);
      expect(getSourcesByCountry('IE')).toEqual([]);
      expect(getSourcesByCountry('XX')).toEqual([]);
    });
  });

  describe('getTier1LinksByCountry', () => {
    it('should return Tier 1 links for KR', () => {
      const krLinks = getTier1LinksByCountry('KR');
      expect(krLinks.length).toBe(1);
      expect(krLinks[0]).toContain('http');
      expect(krLinks[0]).toContain('nutriciastore.co.kr');
    });

    it('should return empty array for other countries', () => {
      expect(getTier1LinksByCountry('DE')).toEqual([]);
      expect(getTier1LinksByCountry('UK')).toEqual([]);
      expect(getTier1LinksByCountry('IE')).toEqual([]);
    });
  });

  describe('Country coverage', () => {
    it('should have KR source with OfficialStore reliability', () => {
      const krSources = getSourcesByCountry('KR');
      expect(krSources.length).toBe(1);
      expect(krSources[0].reliability_label).toBe('OfficialStore');
    });

    it('should have KR source with IMAGE_OCR strategy', () => {
      const krSources = getSourcesByCountry('KR');
      expect(krSources.length).toBe(1);
      expect(krSources[0].parse_strategy).toBe('IMAGE_OCR');
    });
  });
});
