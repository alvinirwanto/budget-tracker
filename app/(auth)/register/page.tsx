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
  name: yup.string().trim().max(60, "Max 60 characters").default(""),
  email: yup.string().trim().email("Enter a valid email").required("Enter your email"),
  password: yup.string().min(8, "Use at least 8 characters").max(72, "Max 72 characters").required("Choose a password"),
  confirm: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords do not match")
    .required("Type the password again"),
});
type Values = yup.InferType<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  // Unique ids: Next keeps the previous page mounted (hidden), so fixed ids would exist twice.
  const uid = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: yupResolver(schema) });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setError("");
    try {
      await api("POST", "/api/auth/register", { name, email, password });
      clearStore();
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not create the account. Check your connection.");
    }
  });

  return (
    <div className="rounded-3xl bg-card p-7 shadow-card dark:border md:p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your data is saved to your account, so it follows you to any device.</p>

      <form onSubmit={onSubmit} noValidate className="mt-7 grid gap-5">
        <Field label="Name (optional)" htmlFor={`${uid}-name`} error={errors.name?.message}>
          <Input id={`${uid}-name`} autoComplete="name" placeholder="What should we call you?" {...register("name")} />
        </Field>
        <Field label="Email" htmlFor={`${uid}-email`} error={errors.email?.message}>
          <Input id={`${uid}-email`} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" {...register("email")} />
        </Field>
        <Field label="Password" htmlFor={`${uid}-password`} error={errors.password?.message} hint="At least 8 characters.">
          <PasswordInput id={`${uid}-password`} autoComplete="new-password" placeholder="Choose a password" {...register("password")} />
        </Field>
        <Field label="Confirm password" htmlFor={`${uid}-confirm`} error={errors.confirm?.message}>
          <PasswordInput id={`${uid}-confirm`} autoComplete="new-password" placeholder="Type it again" {...register("confirm")} />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-expense/10 px-4 py-3 text-sm font-medium text-expense">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting} className="h-12 rounded-full text-base font-bold">
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Log in
        </Link>
      </p>
    </div>
  );
}
