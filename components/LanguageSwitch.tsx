import { type Locale, messages } from "@/lib/i18n";

type Props = {
  locale: Locale;
  onChange: (locale: Locale) => void;
};

export function LanguageSwitch({ locale, onChange }: Props) {
  const t = messages[locale];

  return (
    <fieldset className="lang-switch">
      <legend className="sr-only">{t.switchLanguage}</legend>
      <button
        type="button"
        aria-pressed={locale === "ja"}
        onClick={() => onChange("ja")}
      >
        {t.langJa}
      </button>
      <button
        type="button"
        className="lang-switch-en"
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
      >
        {t.langEn}
      </button>
    </fieldset>
  );
}
