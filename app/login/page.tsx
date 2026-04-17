'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Building2, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error('Email ou senha inválidos')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #005429 0%, #00883A 50%, #005429 100%)' }}>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg" style={{ backgroundColor: '#005429' }}>
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CAD Atendimento</h1>
          <p className="mt-2 text-sm" style={{ color: '#a8f0bc' }}>Cadastro Único — Sistema de Gestão</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/97 backdrop-blur">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#00883A' }} />
            </div>
            <CardTitle className="text-xl font-semibold" style={{ color: '#005429' }}>Entrar no sistema</CardTitle>
            <CardDescription>Use suas credenciais de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="servidor@prefeitura.gov.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10 text-white font-medium" style={{ backgroundColor: '#00883A' }} disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                ) : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs" style={{ color: 'rgba(168,240,188,0.7)' }}>
          Acesso restrito. Solicite cadastro ao administrador.
        </p>
      </div>
    </div>
  )
}
