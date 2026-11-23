"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/fields";
import { PasswordInput } from "@/components/password-input";
import { api, ApiError } from "@/lib/api";
import { clearStore } from "@/lib/store";

const schema = yup.object({
  email: yup.string().trim().email("Enter a valid email").required("Enter your email"),
  password: yup.string().required("Enter your password"),
});
type Values = yup.InferType<typeof schema>;

/** Only go to a page inside this app. */
function safeNext() {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  // Unique ids: Next keeps the previous page mounted (hidden), so fixed ids would exist twice.
  const uid = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: yupResolver(schema) });

  const onSubmit = handleSubmit(async (v) => {
    setError("");
    try {
      await api("POST", "/api/auth/login", v);
      clearStore();
      router.replace(safeNext());
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not log in. Check your connection.");
    }
  });

  return (
    <div className="rounded-3xl bg-card p-7 shadow-card dark:border md:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted-foreground">Log in to see your pockets, budgets and bills.</p>

      <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-5">
        <Field label="Email" htmlFor={`${uid}-email`} error={errors.email?.message}>
          <Input id={`${uid}-email`} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field label="Password" htmlFor={`${uid}-password`} error={errors.password?.message}>
          <PasswordInput id={`${uid}-password`} autoComplete="current-password" placeholder="Your password" {...register("password")} />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-expense/10 px-4 py-3 text-sm font-medium text-expense">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="h-12 rounded-full text-base font-bold">
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}
