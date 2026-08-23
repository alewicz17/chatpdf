import LoginForm from "@/components/login-form";

/** Destinazione dopo il login: solo path interni, mai un URL assoluto. */
function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="max-w-sm text-center">
        <p className="eyebrow">Lettura assistita di PDF</p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
          ChatPDF
        </h1>
        <p className="mt-3 font-serif text-[0.9375rem] leading-7 text-ink-soft">
          Accedi per caricare i tuoi PDF e ritrovarli quando torni.
        </p>
      </div>

      <LoginForm next={safeNext(params.next)} />
    </main>
  );
}
