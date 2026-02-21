// tests/sources.test.ts

import { SOURCES, getTier1Sources, getSourcesByCountry, getTier1LinksByCountry } from '../src/sources';

describe('Sources', () => {
  describe('SOURCES array', () => {
    it('should have sources for all countries', () => {
      const countries = ['DE', 'UK', 'IE', 'KR'];
      
      for (const country of countries) {
        const countrySources = SOURCES.filter((s) => s.country_code === country);
        expect(countrySources.length).toBeGreaterThan(0);
      }
    });

    it('should have at least one Tier 1 source per country', () => {
      const countries = ['DE', 'UK', 'IE', 'KR'];
      
      for (const country of countries) {
        const tier1Sources = SOURCES.filter(
          (s) => s.country_code === country && s.tier === 1
        );
        expect(tier1Sources.length).toBeGreaterThanOrEqual(1);
      }
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

    it('should have unique source keys', () => {
      const keys = SOURCES.map((s) => s.source_key);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });
  });

  describe('getTier1Sources', () => {
    it('should return only Tier 1 sources', () => {
      const tier1 = getTier1Sources();
      
      expect(tier1.length).toBeGreaterThan(0);
      for (const source of tier1) {
        expect(source.tier).toBe(1);
      }
    });

    it('should have at least 4 Tier 1 sources (one per country)', () => {
      const tier1 = getTier1Sources();
      expect(tier1.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getSourcesByCountry', () => {
    it('should return sources for DE', () => {
      const deSources = getSourcesByCountry('DE');
      expect(deSources.length).toBeGreaterThan(0);
      
      for (const source of deSources) {
        expect(source.country_code).toBe('DE');
      }
    });

    it('should return sources for UK', () => {
      const ukSources = getSourcesByCountry('UK');
      expect(ukSources.length).toBeGreaterThan(0);
      
      for (const source of ukSources) {
        expect(source.country_code).toBe('UK');
      }
    });

    it('should return sources for IE', () => {
      const ieSources = getSourcesByCountry('IE');
      expect(ieSources.length).toBeGreaterThan(0);
      
      for (const source of ieSources) {
        expect(source.country_code).toBe('IE');
      }
    });

    it('should return sources for KR', () => {
      const krSources = getSourcesByCountry('KR');
      expect(krSources.length).toBeGreaterThan(0);
      
      for (const source of krSources) {
        expect(source.country_code).toBe('KR');
      }
    });

    it('should return empty array for unknown country', () => {
      const unknownSources = getSourcesByCountry('XX');
      expect(unknownSources).toEqual([]);
    });
  });

  describe('getTier1LinksByCountry', () => {
    it('should return Tier 1 links for DE', () => {
      const deLinks = getTier1LinksByCountry('DE');
      expect(deLinks.length).toBeGreaterThan(0);
      
      for (const link of deLinks) {
        expect(link).toContain('http');
      }
    });

    it('should return Tier 1 links for UK', () => {
      const ukLinks = getTier1LinksByCountry('UK');
      expect(ukLinks.length).toBeGreaterThan(0);
    });

    it('should return Tier 1 links for IE', () => {
      const ieLinks = getTier1LinksByCountry('IE');
      expect(ieLinks.length).toBeGreaterThan(0);
    });

    it('should return Tier 1 links for KR', () => {
      const krLinks = getTier1LinksByCountry('KR');
      expect(krLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Country coverage', () => {
    it('should have DE sources with Official reliability', () => {
      const deSources = getSourcesByCountry('DE');
      const officialSources = deSources.filter((s) => s.reliability_label === 'Official');
      expect(officialSources.length).toBeGreaterThan(0);
    });

    it('should have UK sources with Regulator reliability', () => {
      const ukSources = getSourcesByCountry('UK');
      const regulatorSources = ukSources.filter((s) => s.reliability_label === 'Regulator');
      expect(regulatorSources.length).toBeGreaterThan(0);
    });

    it('should have IE sources with Regulator reliability', () => {
      const ieSources = getSourcesByCountry('IE');
      const regulatorSources = ieSources.filter((s) => s.reliability_label === 'Regulator');
      expect(regulatorSources.length).toBeGreaterThan(0);
    });

    it('should have KR sources with OfficialStore reliability', () => {
      const krSources = getSourcesByCountry('KR');
      const storeSources = krSources.filter((s) => s.reliability_label === 'OfficialStore');
      expect(storeSources.length).toBeGreaterThan(0);
    });
  });
});
