"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema } from "@/lib/schemas/validation"
import { Form, FormItem, FormLabel, FormMessage } from "../ui/form"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function RegisterForm() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  const onSubmit = async (values: any) => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success("Conta criada com sucesso!")
        router.push("/dashboard")
        router.refresh()
      } else {
        toast.error(data.error || "Erro ao criar conta")
      }
    } catch {
      toast.error("Erro de conexão ao servidor")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormItem>
        <FormLabel>E-mail</FormLabel>
        <Input
          placeholder="exemplo@dominio.com"
          type="email"
          {...form.register("email")}
          disabled={loading}
        />
        <FormMessage>{form.formState.errors.email?.message}</FormMessage>
      </FormItem>
      <FormItem>
        <FormLabel>Senha</FormLabel>
        <Input
          placeholder="••••••••"
          type="password"
          {...form.register("password")}
          disabled={loading}
        />
        <FormMessage>{form.formState.errors.password?.message}</FormMessage>
      </FormItem>
      <FormItem>
        <FormLabel>Confirmar Senha</FormLabel>
        <Input
          placeholder="••••••••"
          type="password"
          {...form.register("confirmPassword")}
          disabled={loading}
        />
        <FormMessage>{form.formState.errors.confirmPassword?.message}</FormMessage>
      </FormItem>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Criando..." : "Criar Conta"}
      </Button>
    </Form>
  )
}
