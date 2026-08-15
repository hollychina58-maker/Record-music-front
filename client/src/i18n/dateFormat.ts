import { useLanguage } from './LanguageContext';

// 2-11: map UI language code to the Intl locale used by toLocaleDateString
const UI_TO_LOCALE: Record<string, string> = {
  zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR',
  fr: 'fr-FR', de: 'de-DE', ru: 'ru-RU', ar: 'ar-SA',
};

export interface DateFormatOptions extends Intl.DateTimeFormatOptions {}

/**
 * Date formatter bound to the current UI language.
 * Usage: const formatDate = useFormatDate(); formatDate(story.created_at, { month: 'long' });
 */
export function useFormatDate(): (date: string | Date, options?: DateFormatOptions) => string {
  const { language } = useLanguage();
  const locale = UI_TO_LOCALE[language] || 'zh-CN';
  return (date, options) => new Date(date).toLocaleDateString(locale, options);
}
