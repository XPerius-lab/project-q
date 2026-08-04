"use client";

import { useTransition } from "react";
import { updateUserRoleAction, toggleBanAction } from "./actions";
import type { User, UserRole } from "@/domain/entities/user";

const ROLES: UserRole[] = ["CUSTOMER", "OWNER", "ADMIN"];

export function UserRow({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b">
      <td className="p-2">{user.name}</td>
      <td className="p-2 text-sm text-muted-foreground">{user.email}</td>
      <td className="p-2">
        <select
          defaultValue={user.role}
          disabled={isPending}
          onChange={(e) =>
            startTransition(() => updateUserRoleAction(user.id, e.target.value as UserRole))
          }
          className="rounded-md border px-2 py-1"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2">
        <button
          disabled={isPending}
          onClick={() => startTransition(() => toggleBanAction(user.id, !user.isBanned))}
          className={`rounded-md px-3 py-1 text-sm ${
            user.isBanned ? "bg-red-100 text-red-700" : "bg-gray-100"
          }`}
        >
          {user.isBanned ? "Banlı — kaldır" : "Banla"}
        </button>
      </td>
    </tr>
  );
}
