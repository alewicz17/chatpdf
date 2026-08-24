import { redirect } from "next/navigation";

import DocumentList from "@/components/document-list";
import LocaleSwitcher from "@/components/locale-switcher";
import PdfDropzone from "@/components/pdf-dropzone";
import UserMenu from "@/components/user-menu";
import { getCurrentUser } from "@/lib/auth/user";
import { getTranslations } from "@/lib/i18n/server";

// La lista riflette gli upload appena fatti: nessuna cache.
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { t } = await getTranslations();

  return (
    <>
      <header className="flex shrink-0 items-center justify-end gap-3 border-b border-rule bg-surface px-4 py-3 sm:px-6">
        <LocaleSwitcher />
        <UserMenu email={user.email ?? ""} />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
        <div className="max-w-md text-center">
          <p className="eyebrow">{t.common.tagline}</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
            {t.common.appName}
          </h1>
          <p className="mt-3 font-serif text-[0.9375rem] leading-7 text-ink-soft">
            {t.home.intro}
          </p>
        </div>

        <PdfDropzone />

        <DocumentList userId={user.id} />
      </main>
    </>
  );
}
