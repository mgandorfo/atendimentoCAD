# CAD Atendimento — Guia de Configuração

## Pré-requisitos

1. Conta no [Supabase](https://supabase.com) (gratuita)
2. Conta no [GitHub](https://github.com) e [Vercel](https://vercel.com)

---

## Passo 1: Configurar Supabase

1. Crie um novo projeto no Supabase
2. Vá em **SQL Editor** e execute o arquivo `supabase/schema.sql` completo
3. Copie as credenciais em **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Criar o primeiro usuário Admin

No **Supabase → Authentication → Users**, clique em "Invite User" ou crie diretamente via SQL:

```sql
-- Após criar o usuário via Authentication > Users, atualize o role:
UPDATE public.profiles 
SET role = 'admin', full_name = 'Administrador'
WHERE id = '<uuid do usuário criado>';
```

---

## Passo 2: Configuração Local

1. Copie o arquivo de ambiente:
```bash
cp .env.local.example .env.local
```

2. Edite `.env.local` com suas credenciais:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxx...
```

3. Execute o servidor de desenvolvimento:
```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

---

## Passo 3: Deploy no Vercel

1. Faça push do projeto para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente no Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy automático a cada push na branch `main`

---

## Estrutura do Banco de Dados

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Usuários do sistema (Admin / Servidor) |
| `setores` | Setores de atendimento |
| `servicos` | Serviços prestados por setor |
| `status_atendimento` | Status possíveis para atendimentos |
| `beneficiarios` | Cidadãos atendidos |
| `atendimentos` | Registros de atendimento |

## Permissões (RLS)

| Perfil | Atendimentos | Beneficiários | Setores/Serviços | Usuários |
|--------|-------------|----------------|------------------|----------|
| Admin | Todos | Todos | CRUD | CRUD |
| Servidor | Próprios | Todos (leitura/criação) | Leitura | — |

---

## Tecnologias

- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS + shadcn/ui
- **Gráficos**: Recharts
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Vercel
