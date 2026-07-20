"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, signOut } from "@/shared/lib/auth";

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Введите email и пароль" };
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      console.error("loginAction signIn error", result.error);
      return { error: "Неверный email или пароль" };
    }

    redirect("/");
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      console.error("loginAction AuthError", error.type, error.cause);
      const cause =
        error.cause instanceof Error ? error.cause.message : String(error.cause ?? "");
      if (
        /Can't reach database|ECONNREFUSED|P1001|does not exist|PrismaClient/i.test(
          cause,
        )
      ) {
        return {
          error:
            "Нет связи с БД. Выполните: docker compose up -d db && npm run db:seed",
        };
      }
      if (error.type === "CredentialsSignin") {
        return { error: "Неверный email или пароль" };
      }
      return { error: `Ошибка входа (${error.type}). Проверьте AUTH_URL и cookies.` };
    }

    console.error("loginAction unexpected error", error);
    return { error: "Ошибка входа. Проверьте, что PostgreSQL запущен." };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
