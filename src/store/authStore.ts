import { create } from "zustand";

export type AuthUser = {
  id: string;
  phone: string;
  name: string | null;
  pointsBalance: number;
};

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  login: (phone: string, name?: string) => Promise<"ok" | "needs_name">;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
};

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    typeof record.phone !== "string" ||
    typeof record.pointsBalance !== "number"
  ) {
    return false;
  }

  return true;
}

function toAuthUser(value: unknown): AuthUser | null {
  if (!isAuthUser(value)) {
    return null;
  }

  const record = value as AuthUser & { name?: unknown };

  return {
    id: record.id,
    phone: record.phone,
    name: typeof record.name === "string" && record.name.trim() ? record.name.trim() : null,
    pointsBalance: record.pointsBalance,
  };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  login: async (phone, name) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name }),
    });
    const payload = (await response.json().catch(() => null)) as {
      user?: unknown;
      error?: unknown;
      needsName?: unknown;
    } | null;

    if (response.ok && payload?.needsName === true) {
      return "needs_name";
    }

    const user = toAuthUser(payload?.user);

    if (!response.ok || !user) {
      const data = payload ?? {};
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : (data.error as { message?: string } | undefined)?.message ||
            (data as { message?: string }).message ||
            "تعذر تسجيل الدخول";
      throw new Error(errorMessage);
    }

    set({ user, ready: true });
    return "ok";
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null, ready: true });
  },
  hydrate: async () => {
    try {
      const response = await fetch("/api/auth/session");
      const payload = (await response.json().catch(() => null)) as { user?: unknown } | null;
      set({ user: toAuthUser(payload?.user), ready: true });
    } catch {
      set({ user: null, ready: true });
    }
  },
}));
