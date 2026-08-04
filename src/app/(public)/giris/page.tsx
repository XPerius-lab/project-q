"use client";

import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import { signIn } from "@/lib/auth-client";

// Next.js, useSearchParams() kullanan client component'lerin build-time
// prerender sırasında Suspense'e sarılmasını zorunlu tutuyor — aksi halde
// tüm /giris rotası statik export'tan düşüyor. GirisPage bu yüzden sadece
// bir Suspense wrapper; asıl form GirisForm içinde.
export default function GirisPage() {
  return (
    <Suspense fallback={null}>
      <GirisForm />
    </Suspense>
  );
}

function GirisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    const { error } = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("E-posta veya şifre hatalı.");
      return;
    }

    const redirectTo = searchParams.get("redirect") ?? "/";
    router.push(redirectTo);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Giriş Yap</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">E-posta</label>
          <input
            type="email"
            className="w-full rounded-md border px-3 py-2"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Şifre</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary py-2 text-primary-foreground disabled:opacity-50"
        >
          {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      <p className="text-center text-sm">
        Hesabınız yok mu?{" "}
        <a href="/kayit" className="underline">
          Kayıt olun
        </a>
      </p>
    </main>
  );
}
