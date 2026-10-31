import { quranpediaUrl } from '@/core/config';
import type { HttpClient } from '@/platform/http';
import { createTafsirRepository } from '../tafsir.repository';
import bookE3rab from '../__fixtures__/book-e3rab.json';
import bookTafsir from '../__fixtures__/book-tafsir.json';
import bookTranslation from '../__fixtures__/book-translation.json';
import optionsE3rab from '../__fixtures__/options-e3rab.json';
import optionsTafsir from '../__fixtures__/options-tafsir.json';
import optionsTranslations from '../__fixtures__/options-translations.json';
import surahInformation from '../__fixtures__/surah-information.json';

/**
 * Recorded quranpedia responses.
 *
 * Ayah 2:262 is absolute 269. The URL assertions are the point: both the option
 * list and the book request must use the **local** `2/262`, which is exactly
 * the mismatch the reference panel had when it sent the absolute number for
 * options and reused `ayahKey` for content.
 */
function clientFor(responses: Record<string, unknown>) {
  const get = jest.fn(async (url: string) => {
    if (!(url in responses)) {
      throw new Error(`Unexpected request: ${url}`);
    }

    return responses[url];
  });

  return { client: { get } as unknown as HttpClient, get };
}

const LOCAL = { surah: 2, ayah: 262 };

describe('createTafsirRepository', () => {
  it('requests the tafsir option list with the local ayah number', async () => {
    const url = quranpediaUrl('v1/ayah/2/262/tafsir');
    const { client, get } = clientFor({ [url]: optionsTafsir });

    const sources = await createTafsirRepository(client).sources(
      'tafsir',
      LOCAL,
    );

    expect(get).toHaveBeenCalledWith(url);
    expect(sources.map((source) => source.id)).toEqual([3, 4, 136]);
    expect(sources[0].name).toBe('تيسير الكريم الرحمن');
    expect(sources[0].author).toBe('السعدي');
  });

  it('uses the plural translations service path', async () => {
    const url = quranpediaUrl('v1/ayah/2/262/translations');
    const { client, get } = clientFor({ [url]: optionsTranslations });

    const sources = await createTafsirRepository(client).sources(
      'translation',
      LOCAL,
    );

    expect(get).toHaveBeenCalledWith(url);
    expect(sources[0]).toMatchObject({ id: 1947 });
  });

  it('requests e3rab sources from the e3rab path', async () => {
    const url = quranpediaUrl('v1/ayah/2/262/e3rab');
    const { client, get } = clientFor({ [url]: optionsE3rab });

    await createTafsirRepository(client).sources('e3rab', LOCAL);

    expect(get).toHaveBeenCalledWith(url);
  });

  it('loads a tafsir body by local ayah and source id, as plain rtl text', async () => {
    const url = quranpediaUrl('v1/ayah/2/262/book/3');
    const { client, get } = clientFor({ [url]: bookTafsir });

    const body = await createTafsirRepository(client).content(
      'tafsir',
      LOCAL,
      3,
    );

    expect(get).toHaveBeenCalledWith(url);
    // Not `/2/269/`, the absolute number the reference mixed in.
    expect(get.mock.calls[0][0]).not.toContain('/2/269/');
    expect(body).toMatchObject({ status: 'ready', direction: 'rtl' });
    if (body.status !== 'ready') throw new Error('unreachable');
    expect(body.text).toContain('الذين ينفقون أموالهم');
    expect(body.text).not.toMatch(/<[^>]+>/);
  });

  it('keeps an ltr translation ltr', async () => {
    const url = quranpediaUrl('v1/ayah/2/262/book/1947');
    const { client } = clientFor({ [url]: bookTranslation });

    const body = await createTafsirRepository(client).content(
      'translation',
      LOCAL,
      1947,
    );

    expect(body).toMatchObject({ status: 'ready', direction: 'ltr' });
    if (body.status !== 'ready') throw new Error('unreachable');
    expect(body.text).toContain('Those who spend their wealth');
  });

  it('loads e3rab text from its book id', async () => {
    const url = quranpediaUrl('v1/ayah/2/262/book/180');
    const { client } = clientFor({ [url]: bookE3rab });

    const body = await createTafsirRepository(client).content(
      'e3rab',
      LOCAL,
      180,
    );

    expect(body).toMatchObject({ status: 'ready', direction: 'rtl' });
  });

  it('loads surah information by surah number', async () => {
    const url = quranpediaUrl('v1/surah/information/2');
    const { client, get } = clientFor({ [url]: surahInformation });

    const sections = await createTafsirRepository(client).surahInfo(2);

    expect(get).toHaveBeenCalledWith(url);
    expect(sections.map((section) => section.key)).toEqual([
      'introduction',
      'surah_type',
      'words_count',
    ]);
  });

  it('rejects invalid identifiers before making a request', async () => {
    const { client, get } = clientFor({});
    const repository = createTafsirRepository(client);

    await expect(
      repository.sources('tafsir', { surah: 0, ayah: 1 }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(
      repository.sources('tafsir', { surah: 1, ayah: 0 }),
    ).rejects.toBeInstanceOf(RangeError);
    await expect(repository.content('tafsir', LOCAL, 0)).rejects.toBeInstanceOf(
      RangeError,
    );
    await expect(repository.surahInfo(115)).rejects.toBeInstanceOf(RangeError);

    expect(get).not.toHaveBeenCalled();
  });

  it('propagates transport failures instead of returning empty text', async () => {
    const client = {
      get: jest.fn(async () => {
        throw new Error('offline');
      }),
    } as unknown as HttpClient;

    await expect(
      createTafsirRepository(client).content('tafsir', LOCAL, 3),
    ).rejects.toThrow('offline');
  });
});
