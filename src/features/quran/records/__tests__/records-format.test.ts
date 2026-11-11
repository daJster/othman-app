import type { SurahMetadata } from '@/core/types';
import {
  absoluteAyahNumber,
  ayahOffset,
  ayahReference,
  surahLabel,
} from '../records-format';

const surahs: Record<string, SurahMetadata> = {
  '1': {
    number: 1,
    name: 'الفاتحة',
    nameEnglish: 'Al-Fatihah',
    location: 'makka',
    ayahCount: 7,
  },
  '2': {
    number: 2,
    name: 'البقرة',
    nameEnglish: 'Al-Baqarah',
    location: 'madina',
    ayahCount: 286,
  },
  '3': {
    number: 3,
    name: 'آل عمران',
    nameEnglish: 'Ali Imran',
    location: 'madina',
    ayahCount: 200,
  },
};

describe('Qur’an record coordinates', () => {
  it('counts the ayat before a surah', () => {
    expect(ayahOffset(surahs, 1)).toBe(0);
    expect(ayahOffset(surahs, 2)).toBe(7);
    expect(ayahOffset(surahs, 3)).toBe(293);
  });

  it('maps a local pair to its absolute ayah', () => {
    expect(absoluteAyahNumber(surahs, 1, 1)).toBe(1);
    expect(absoluteAyahNumber(surahs, 2, 1)).toBe(8);
    expect(absoluteAyahNumber(surahs, 3, 7)).toBe(300);
  });

  it('refuses a pair that does not exist', () => {
    expect(absoluteAyahNumber(surahs, 2, 287)).toBeNull();
    expect(absoluteAyahNumber(surahs, 115, 1)).toBeNull();
    expect(absoluteAyahNumber(surahs, 9, 1)).toBeNull();
  });

  it('falls back to a numbered label without metadata', () => {
    expect(surahLabel(undefined, 9, 'ar')).toBe('سورة 9');
    expect(surahLabel(undefined, 9, 'en')).toBe('Surah 9');
    expect(surahLabel(surahs['2'], 2, 'en')).toBe('Al-Baqarah');
  });

  it('formats a reference with the language’s digits', () => {
    expect(ayahReference('Al-Baqarah', 255, 'en')).toBe(
      'Al-Baqarah · Ayah 255',
    );
    expect(ayahReference('البقرة', 255, 'ar')).toContain('٢٥٥');
  });
});
