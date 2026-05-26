import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const VALID_LOCALES = ["es", "en", "fr", "de", "pt"] as const;
type Locale = (typeof VALID_LOCALES)[number];

const messageLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  es: () => import("../messages/es.json"),
  en: () => import("../messages/en.json"),
  fr: () => import("../messages/fr.json"),
  de: () => import("../messages/de.json"),
  pt: () => import("../messages/pt.json"),
};

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("vf_locale")?.value;
  const locale: Locale = (raw && VALID_LOCALES.includes(raw as Locale)) ? (raw as Locale) : "es";

  const messages = (await messageLoaders[locale]()).default;

  return { locale, messages };
});
