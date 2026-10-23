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
  login: (input: { phone: string; password: string; name?: string }) => Promise<void>;
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
  login: async ({ phone, password, name }) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password, name: name?.trim() || undefined }),
    });
    const payload = (await response.json().catch(() => null)) as {
      user?: unknown;
      error?: unknown;
    } | null;

    const user = toAuthUser(payload?.user);

    if (!response.ok || !user) {
      const data = payload ?? {};
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : (data.error as { message?: string } | undefined)?.message ||
            (data as { message?: string }).message ||
            "failed";
      throw new Error(errorMessage);
    }

    set({ user, ready: true });
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
