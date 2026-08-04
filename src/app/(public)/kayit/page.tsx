"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { signUp } from "@/lib/auth-client";

// NOT: Bu form her zaman CUSTOMER rolüyle kayıt açar. Villa sahibi (OWNER)
// hesapları admin tarafından oluşturulur (spec: "Villa sahibi doğrudan ilan
// oluşturamaz" kuralına paralel — hesap açma yetkisi de admin'de).
export default function KayitPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    const { error } = await signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        error.message === "USER_ALREADY_EXISTS"
          ? "Bu e-posta ile zaten bir hesap var."
          : "Kayıt sırasında bir hata oluştu.",
      );
      return;
    }

    router.push("/");
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold">Hesap Oluştur</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Ad Soyad</label>
          <input className="w-full rounded-md border px-3 py-2" {...register("name")} />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

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
          <label className="mb-1 block text-sm font-medium">Telefon (opsiyonel)</label>
          <input className="w-full rounded-md border px-3 py-2" {...register("phone")} />
          {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
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

        <div>
          <label className="mb-1 block text-sm font-medium">Şifre (tekrar)</label>
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2"
            {...register("passwordConfirm")}
          />
          {errors.passwordConfirm && (
            <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-primary py-2 text-primary-foreground disabled:opacity-50"
        >
          {isSubmitting ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
        </button>
      </form>

      <p className="text-center text-sm">
        Zaten hesabınız var mı?{" "}
        <a href="/giris" className="underline">
          Giriş yapın
        </a>
      </p>
    </main>
  );
}
