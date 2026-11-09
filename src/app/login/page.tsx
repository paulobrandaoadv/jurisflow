import { Suspense } from "react";
import { signIn } from "@/app/login/actions";
import { CampoSenha } from "@/app/login/campo-senha";

const MENSAGENS_ERRO: Record<string, string> = {
  campos: "Informe e-mail e senha.",
  credenciais: "E-mail ou senha inválidos.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  return (
    <Suspense fallback={null}>
      <LoginForm searchParams={searchParams} />
    </Suspense>
  );
}

async function LoginForm({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const mensagem = erro ? MENSAGENS_ERRO[erro] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <main className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">JurisFlow</h1>
        <p className="mt-1 text-sm text-slate-500">Acesso restrito a usuários cadastrados.</p>

        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Senha
            </label>
            <CampoSenha />
          </div>

          {mensagem && (
            <p role="alert" className="text-sm text-red-600">
              {mensagem}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}
