import LocaleSwitcher from "@/components/locale-switcher";
import LoginForm from "@/components/login-form";
import { getTranslations } from "@/lib/i18n/server";

/** Destinazione dopo il login: solo path interni, mai un URL assoluto. */
function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const { t } = await getTranslations();

  return (
    <>
      <header className="flex shrink-0 items-center justify-end border-b border-rule bg-surface px-4 py-3 sm:px-6">
        <LocaleSwitcher />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
        <div className="max-w-sm text-center">
          <p className="eyebrow">{t.common.tagline}</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
            {t.common.appName}
          </h1>
          <p className="mt-3 font-serif text-[0.9375rem] leading-7 text-ink-soft">
            {t.login.intro}
          </p>
        </div>

        <LoginForm next={safeNext(params.next)} />
      </main>
    </>
  );
}
