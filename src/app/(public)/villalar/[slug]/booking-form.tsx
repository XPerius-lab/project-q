"use client";

import { useState, useTransition } from "react";
import { createBookingAction } from "./actions";

export function BookingForm({ villaId, basePrice }: { villaId: string; basePrice: number }) {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const nights =
    checkIn && checkOut && checkOut > checkIn
      ? Math.round((+new Date(checkOut) - +new Date(checkIn)) / 86_400_000)
      : 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nights <= 0) {
      setResult({ ok: false, message: "Lütfen geçerli bir giriş/çıkış tarihi seçin." });
      return;
    }
    startTransition(async () => {
      const res = await createBookingAction(villaId, checkIn, checkOut);
      setResult(
        res.ok
          ? { ok: true, message: "Rezervasyon talebiniz alındı — onay bekleniyor." }
          : { ok: false, message: res.error },
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border p-4">
      <h3 className="mb-3 font-medium">Rezervasyon</h3>
      <div className="mb-3 flex gap-3">
        <label className="flex-1 text-sm">
          Giriş
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            required
          />
        </label>
        <label className="flex-1 text-sm">
          Çıkış
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full rounded-md border px-2 py-1.5"
            required
          />
        </label>
      </div>

      {nights > 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          {nights} gece · yaklaşık {nights * basePrice} AZN (kesin fiyat, seçilen tarihlerdeki
          gerçek gecelik fiyatlara göre onay adımında hesaplanır)
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {isPending ? "Gönderiliyor…" : "Rezervasyon Talebi Gönder"}
      </button>

      {result && (
        <p className={`mt-3 text-sm ${result.ok ? "text-emerald-700" : "text-red-600"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
