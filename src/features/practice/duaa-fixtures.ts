/**
 * The three duaas of the day.
 *
 * Demo content, in the same bilingual shape the rest of the app uses. They are
 * short on purpose: each one is a card the reader swipes in a bottom sheet, so
 * it has to be readable at a glance and leave room for the gesture.
 */
export type PracticeDuaa = {
  readonly id: string;
  readonly title: { readonly ar: string; readonly en: string };
  readonly body: { readonly ar: string; readonly en: string };
};

export const DAILY_DUAAS: readonly PracticeDuaa[] = [
  {
    id: 'duaa-guidance',
    title: {
      ar: 'اللهم اهدني فيمن هديت',
      en: 'O Allah, guide me among those You have guided',
    },
    body: {
      ar: 'تُقال بعد صلاة الفجر، وتُختم بالصلاة على النبي ﷺ.',
      en: 'Recited after Fajr, closed with the prayer upon the Prophet ﷺ.',
    },
  },
  {
    id: 'duaa-protection',
    title: {
      ar: 'بسم الله الذي لا يضر مع اسمه شيء',
      en: 'In the name of Allah, whose name nothing can harm',
    },
    body: {
      ar: 'ثلاث مرات في الصباح والمساء، يقي الله بها صاحبها.',
      en: 'Three times morning and evening; Allah protects the one who says it.',
    },
  },
  {
    id: 'duaa-forgiveness',
    title: {
      ar: 'أستغفر الله وأتوب إليه',
      en: 'I seek Allah’s forgiveness and turn to Him',
    },
    body: {
      ar: 'خير ما يُقال في المجلس، وأثقل ما يوضع في الميزان.',
      en: 'The best words of a gathering, and the heaviest on the scale.',
    },
  },
];
