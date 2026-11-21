import { defineFunction, ok } from './types.ts';
import type { FunctionResult } from './types.ts';

/**
 * The inbox.
 *
 * Demo content, shaped like the `CircleItem` record the app already renders, so
 * the client keeps one type for a notice whether it came from the local fixture
 * or from here. Rows are relative to *now* — a hard-coded April date would be
 * stale by the time anyone opened it — and there are enough of them to make the
 * panel scroll, which is the only way to judge its edge treatment.
 *
 * `createdAt` is the real timestamp behind "12 min ago": `date` is the calendar
 * day the list groups by, and the two are kept in step by `ago()`.
 *
 * **The delay is the point.** Notices are the one surface that shows a waiting
 * state, and an endpoint that answers in 2 ms never exercises it. A little under
 * a second is long enough to see the spinner and short enough not to feel
 * broken.
 */
const NOTICE_DELAY_MS = 850;
/** Rows per page. The panel asks for the next page as you reach the end. */
const PAGE_SIZE = 6;

type Localized = { readonly ar: string; readonly en: string };

type NoticeRow = {
  readonly id: string;
  readonly kind: 'notice';
  readonly date: string;
  /** ISO timestamp. Drives "12 min ago" and the day grouping. */
  readonly createdAt: string;
  readonly time: null;
  readonly title: Localized;
  readonly body: Localized;
  readonly meta: null;
  readonly topic: 'shaykh' | 'halqa' | 'app';
  readonly href: null;
};

/** Local calendar day, `days` back from today, as `YYYY-MM-DD`. */
function dayOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function ago(minutes: number): { createdAt: string; date: string } {
  const at = new Date(Date.now() - minutes * 60_000);

  return { createdAt: at.toISOString(), date: dayOf(at) };
}

function notice(
  id: string,
  minutes: number,
  topic: NoticeRow['topic'],
  title: Localized,
  body: Localized,
): NoticeRow {
  return {
    id,
    kind: 'notice',
    topic,
    title,
    body,
    ...ago(minutes),
    time: null,
    meta: null,
    href: null,
  };
}

const BASE_NOTICES: readonly NoticeRow[] = [
  notice(
    'notice-halqa-shift',
    6,
    'halqa',
    {
      ar: 'حلقة الغد تأخّرت نصف ساعة',
      en: 'Tomorrow’s session moved thirty minutes later',
    },
    {
      ar: 'تبدأ الحلقة السادسة والنصف بدلًا من السادسة، لانشغال الشيخ بدارة إجازة.',
      en: 'The session starts at 6:30 instead of 6:00 while the shaykh sits an ijazah review.',
    },
  ),
  notice(
    'notice-recitation',
    38,
    'app',
    {
      ar: 'تسميع هذا الأسبوع: من الآية ١٢٠ إلى ١٨٠',
      en: 'This week’s recitation: ayah 120 to 180',
    },
    {
      ar: 'نبدأ من الآية ١٢٠ ونقف عند ١٨٠، من أتمّ الحفظ مبكرًا ينتقل إلى المراجعة.',
      en: 'We start at ayah 120 and stop at 180; early finishers move on to review.',
    },
  ),
  notice(
    'notice-mushaf-position',
    95,
    'app',
    {
      ar: 'المصحف صار يحفظ موضع القراءة لكل صفحة',
      en: 'The reader now remembers your place on every page',
    },
    {
      ar: 'أغلق التطبيق وعد متى شئت؛ يفتح المصحف على آخر صفحة قرأتها.',
      en: 'Close the app and come back whenever; it opens on the last page you read.',
    },
  ),
  notice(
    'notice-shaykh-note',
    190,
    'shaykh',
    {
      ar: 'تذكير بآداب الحلقة قبل بداية الأسبوع الجديد إن شاء الله',
      en: 'A reminder on circle etiquette before the new week begins',
    },
    {
      ar: 'الحضور قبل الموعد بخمس دقائق، وإغلاق الجوال، وفتح المصحف على صفحة الدرس.',
      en: 'Arrive five minutes early, silence the phone, and open the mushaf to the lesson page.',
    },
  ),
  notice(
    'notice-exam',
    400,
    'halqa',
    {
      ar: 'اختبار الجزء الثالث بعد خمسة أيام',
      en: 'Third juz exam in five days',
    },
    {
      ar: 'يشمل الجزء الثالث كاملًا، مع تسميع متصل من أول الجزء.',
      en: 'Covers the whole third juz, recited continuously from its first ayah.',
    },
  ),
  notice(
    'notice-ijazah',
    640,
    'shaykh',
    {
      ar: 'فتح باب الإجازة لثلاثة طلاب',
      en: 'Ijazah track opens for three students',
    },
    {
      ar: 'من أتمّ حفظ الجزء الثلاثين كاملًا يمكنه التقدّم للاختبار أمام الشيخ.',
      en: 'Anyone who has completed the thirtieth juz may apply to sit the shaykh’s examination.',
    },
  ),
  notice(
    'notice-library',
    1500,
    'app',
    {
      ar: 'مكتبة التفسير أُضيفت إلى القارئ',
      en: 'A tafsir library was added to the reader',
    },
    {
      ar: 'اختر آية من الصفحة لتقرأ تفسيرها بجانب المصحف.',
      en: 'Pick an ayah on the page to read its tafsir beside the mushaf.',
    },
  ),
  notice(
    'notice-holiday',
    1800,
    'halqa',
    { ar: 'لا حلقة يوم الجمعة القادمة', en: 'No session next Friday' },
    {
      ar: 'نستأنف السبت في الموعد المعتاد.',
      en: 'We resume on Saturday at the usual time.',
    },
  ),
  notice(
    'notice-hifz-plan',
    2900,
    'shaykh',
    {
      ar: 'خطة الحفظ للشهر القادم جاهزة',
      en: 'Next month’s memorisation plan is ready',
    },
    {
      ar: 'ثلاثة أرباع في الأسبوع، ومراجعة يومية لما سبق.',
      en: 'Three quarters a week, with a daily review of what came before.',
    },
  ),
  notice(
    'notice-audio',
    4300,
    'app',
    {
      ar: 'يمكنك الآن سماع التلاوة أثناء القراءة',
      en: 'You can now hear the recitation while you read',
    },
    {
      ar: 'اضغط على أيقونة الصوت في شريط صفحة المصحف.',
      en: 'Tap the audio glyph in the mushaf page bar.',
    },
  ),
  notice(
    'notice-attendance',
    5600,
    'halqa',
    {
      ar: 'سجل الحضور صار مرئيًا لك',
      en: 'Your attendance record is now visible',
    },
    {
      ar: 'من صفحة حسابك ترى حضورك في كل حلقة هذا الشهر.',
      en: 'Your account page shows your attendance for every session this month.',
    },
  ),
  notice(
    'notice-new-student',
    7200,
    'halqa',
    {
      ar: 'انضم طالبان جديدان إلى الحلقة',
      en: 'Two new students joined the circle',
    },
    {
      ar: 'رحّبوا بهما في حلقة الأحد القادمة إن شاء الله.',
      en: 'Welcome them at next Sunday’s session, God willing.',
    },
  ),
  notice(
    'notice-quran-index',
    9000,
    'app',
    { ar: 'فهرس السور صار أسرع', en: 'The surah index is faster' },
    {
      ar: 'البحث في الفهرس يعمل الآن بدون انتظار.',
      en: 'Searching the index now runs without a wait.',
    },
  ),
  notice(
    'notice-ramadan',
    11500,
    'shaykh',
    { ar: 'ترتيب حلقات رمضان', en: 'How the Ramadan sessions will run' },
    {
      ar: 'حلقة بعد العصر كل يوم، وختمة في العشر الأواخر.',
      en: 'One session after Asr each day, and a complete recitation in the last ten nights.',
    },
  ),
];

/** Extra archive rows used only by the native full-screen tray. */
const EXTENDED_NOTICES: readonly NoticeRow[] = [
  notice(
    'notice-review-cadence',
    15000,
    'shaykh',
    {
      ar: 'موعد المراجعة الأسبوعية',
      en: 'The weekly review has a new time',
    },
    {
      ar: 'تبدأ المراجعة بعد المغرب يوم الثلاثاء، وأحضروا صفحات الأسبوع.',
      en: 'Review begins after Maghrib on Tuesday; bring the pages from this week.',
    },
  ),
  notice(
    'notice-tajwid-circle',
    18000,
    'halqa',
    {
      ar: 'حلقة التجويد للمبتدئين',
      en: 'Beginner tajwid circle this weekend',
    },
    {
      ar: 'سنراجع أحكام النون الساكنة والتنوين مع أمثلة من سورة الملك.',
      en: 'We will review noon sakinah and tanween with examples from Surat Al-Mulk.',
    },
  ),
  notice(
    'notice-attendance-note',
    21000,
    'halqa',
    {
      ar: 'تأكيد الحضور قبل الحلقة',
      en: 'Confirm attendance before the circle',
    },
    {
      ar: 'يرجى تحديث حالة الحضور من صفحة اللقاء قبل بدء الحلقة.',
      en: 'Please update your attendance from the meeting page before the session.',
    },
  ),
  notice(
    'notice-translation-update',
    25000,
    'app',
    {
      ar: 'تحسين عرض الترجمة',
      en: 'Translation display has been improved',
    },
    {
      ar: 'يمكنك الآن تكبير نص الترجمة من إعدادات القراءة.',
      en: 'You can now increase translation text size in reading settings.',
    },
  ),
  notice(
    'notice-bookmark-reminder',
    29000,
    'app',
    {
      ar: 'ارجع إلى مواضعك المحفوظة',
      en: 'Pick up where your bookmarks left off',
    },
    {
      ar: 'تجد الآيات التي حفظتها في قائمة العلامات داخل المصحف.',
      en: 'Find the ayahs you saved in the bookmarks list in the mushaf.',
    },
  ),
  notice(
    'notice-surah-mulk',
    35000,
    'shaykh',
    {
      ar: 'تسميع سورة الملك الأسبوع القادم',
      en: 'Surat Al-Mulk recitation next week',
    },
    {
      ar: 'يبدأ التسميع من الآية الأولى بعد مراجعة مخارج الحروف.',
      en: 'Recitation starts from the first ayah after a review of articulation points.',
    },
  ),
  notice(
    'notice-weekend-circle',
    42000,
    'halqa',
    {
      ar: 'تغيير مكان حلقة السبت',
      en: 'Saturday’s circle has a new room',
    },
    {
      ar: 'سنلتقي في القاعة الشرقية في الطابق الأول.',
      en: 'We will meet in the east room on the first floor.',
    },
  ),
  notice(
    'notice-review-portion',
    50000,
    'shaykh',
    {
      ar: 'مقدار المراجعة لهذا الأسبوع',
      en: 'This week’s review portion',
    },
    {
      ar: 'راجعوا آخر وجهين من كل جزء أتممتموه قبل اللقاء.',
      en: 'Review the last two pages of each juz you have completed before we meet.',
    },
  ),
  notice(
    'notice-reader-theme',
    58000,
    'app',
    {
      ar: 'خيارات جديدة لمظهر المصحف',
      en: 'New mushaf appearance options',
    },
    {
      ar: 'اختر الوضع الداكن أو الفاتح من إعدادات القراءة.',
      en: 'Choose dark or light appearance from the reading settings.',
    },
  ),
  notice(
    'notice-audio-speed',
    67000,
    'app',
    {
      ar: 'تحكم بسرعة التلاوة',
      en: 'Adjust the recitation speed',
    },
    {
      ar: 'تتوفر الآن سرعات إضافية في مشغل التلاوة.',
      en: 'Additional playback speeds are now available in the recitation player.',
    },
  ),
  notice(
    'notice-quiz',
    78000,
    'halqa',
    {
      ar: 'مراجعة قصيرة بعد درس الأحد',
      en: 'A short review follows Sunday’s lesson',
    },
    {
      ar: 'خمس أسئلة للتأكد من ضبط الآيات التي قرأناها معًا.',
      en: 'Five questions will help check the ayahs we read together.',
    },
  ),
  notice(
    'notice-weekly-goal',
    90000,
    'app',
    {
      ar: 'حدّث هدف القراءة الأسبوعي',
      en: 'Set your weekly reading goal',
    },
    {
      ar: 'اختر عدد الصفحات المناسب لوقتك من صفحة الحساب.',
      en: 'Choose a page goal that fits your schedule from the account page.',
    },
  ),
  notice(
    'notice-meeting-notes',
    105000,
    'shaykh',
    {
      ar: 'ملاحظات لقاء هذا الأسبوع',
      en: 'Notes from this week’s meeting',
    },
    {
      ar: 'أضيفت ملاحظات الشيخ إلى صفحة اللقاء للرجوع إليها.',
      en: 'The shaykh’s notes have been added to the meeting page for reference.',
    },
  ),
  notice(
    'notice-recitation-feedback',
    125000,
    'shaykh',
    {
      ar: 'ملاحظات على التسميع الأخير',
      en: 'Feedback from your last recitation',
    },
    {
      ar: 'راجع ملاحظات الشيخ على مواضع الوقف والمدود.',
      en: 'Review the shaykh’s notes on pauses and elongations.',
    },
  ),
  notice(
    'notice-winter-schedule',
    145000,
    'halqa',
    {
      ar: 'مواعيد الحلقات في الشتاء',
      en: 'Winter circle schedule',
    },
    {
      ar: 'تبدأ حلقات المساء قبل الموعد المعتاد بنصف ساعة.',
      en: 'Evening circles will start thirty minutes earlier than usual.',
    },
  ),
  notice(
    'notice-reading-sync',
    165000,
    'app',
    {
      ar: 'موضع القراءة محفوظ على هذا الجهاز',
      en: 'Your reading place is saved on this device',
    },
    {
      ar: 'يفتح المصحف على آخر صفحة قرأتها في هذا الجهاز.',
      en: 'The mushaf opens to the last page you read on this device.',
    },
  ),
  notice(
    'notice-start-here',
    190000,
    'app',
    {
      ar: 'ابدأ بخطوات بسيطة',
      en: 'A few simple ways to get started',
    },
    {
      ar: 'اختر سورة للقراءة، ثم احفظ موضعك بعلامة للرجوع إليه.',
      en: 'Choose a surah to read, then bookmark your place to return later.',
    },
  ),
  notice(
    'notice-teacher-availability',
    220000,
    'shaykh',
    {
      ar: 'أوقات لقاء الشيخ هذا الشهر',
      en: 'The shaykh’s available times this month',
    },
    {
      ar: 'تتوفر مواعيد جديدة للمراجعة الفردية في صفحة اللقاءات.',
      en: 'New individual review times are available on the meetings page.',
    },
  ),
];

const NOTICES: readonly NoticeRow[] = [...BASE_NOTICES, ...EXTENDED_NOTICES];

const list = defineFunction(async (event): Promise<FunctionResult> => {
  await new Promise((resolve) => setTimeout(resolve, NOTICE_DELAY_MS));

  /*
   * Paged, because the panel pages. Default page size is small enough that a
   * phone shows roughly one screenful: the panel then has to ask for the next
   * page while scrolling, which is the behaviour being exercised.
   */
  const requestedPage = Number(event.query.page ?? '1');
  const requestedLimit = Number(event.query.limit ?? String(PAGE_SIZE));
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;
  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 50)
      : PAGE_SIZE;
  const notices = event.query.extended === 'true' ? NOTICES : BASE_NOTICES;
  const start = (page - 1) * limit;

  return ok({
    notices: notices.slice(start, start + limit),
    page,
    hasMore: start + limit < notices.length,
    total: notices.length,
  });
});

export const noticeFunctions = {
  'notices.list': list,
};
