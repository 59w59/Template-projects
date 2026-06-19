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
  const [oauthProviders, setOauthProviders] = React.useState<any>({})

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setOauthProviders(data.data)
        }
      })
  }, [])

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
      toast.error("Erro de conexao ao servidor")
    } finally {
      setLoading(false)
    }
  }

  const showOAuth = oauthProviders && (
    oauthProviders.googleLoginEnabled ||
    oauthProviders.githubLoginEnabled ||
    oauthProviders.discordLoginEnabled ||
    oauthProviders.appleLoginEnabled
  )

  return (
    <div className="space-y-4">
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

      {showOAuth && (
        <div className="space-y-3 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-background px-2 text-muted-foreground font-light">Ou cadastrar com</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {oauthProviders.googleLoginEnabled && (
              <button
                type="button"
                onClick={() => window.location.href = "/api/auth/oauth/google"}
                className="flex items-center justify-center gap-2 py-2 px-3 border border-border rounded-xl text-[10px] font-bold hover:bg-secondary transition-all cursor-pointer"
              >
                Google
              </button>
            )}
            {oauthProviders.githubLoginEnabled && (
              <button
                type="button"
                onClick={() => window.location.href = "/api/auth/oauth/github"}
                className="flex items-center justify-center gap-2 py-2 px-3 border border-border rounded-xl text-[10px] font-bold hover:bg-secondary transition-all cursor-pointer"
              >
                GitHub
              </button>
            )}
            {oauthProviders.discordLoginEnabled && (
              <button
                type="button"
                onClick={() => window.location.href = "/api/auth/oauth/discord"}
                className="flex items-center justify-center gap-2 py-2 px-3 border border-border rounded-xl text-[10px] font-bold hover:bg-secondary transition-all cursor-pointer"
              >
                Discord
              </button>
            )}
            {oauthProviders.appleLoginEnabled && (
              <button
                type="button"
                onClick={() => window.location.href = "/api/auth/oauth/apple"}
                className="flex items-center justify-center gap-2 py-2 px-3 border border-border rounded-xl text-[10px] font-bold hover:bg-secondary transition-all cursor-pointer"
              >
                Apple
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
