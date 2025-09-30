// supabase/functions/cadastrar_usuario/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Lê as variáveis de ambiente definidas nas Settings da Function
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // ajuste se quiser restringir domínio
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Responde preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const { posto_graduacao, nome, cpf, email, senha } = body ?? {};

    if (!posto_graduacao || !nome || !cpf || !email || !senha) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1) Cria usuário e envia e-mail (invite)
    // Se já existir, esse método retorna erro 422 - tratamos abaixo
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        password: senha,
        redirectTo: `${supabaseUrl}/auth/v1/callback`, // opcional
      });

    // Se já existe, tenta obter usuário pelo e-mail
    let userId: string | null = null;

    if (inviteError) {
      // Pode significar que o usuário já existe
      // Vamos tentar encontrá-lo via Admin API (listUsers com filtro)
      const { data: list, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
        email: email,
      } as any);

      if (listError || !list?.users?.[0]) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      userId = list.users[0].id;
    } else {
      userId = inviteData?.user?.id ?? null;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Não foi possível obter o usuário." }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2) Insere na tabela usuarios (Service Role ignora RLS)
    const { error: insertError } = await supabase
      .from("usuarios")
      .insert([{ user_id: userId, posto_graduacao, nome, cpf, email }]);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({
        message:
          "Usuário cadastrado com sucesso! Enviamos um e-mail para confirmação.",
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Erro inesperado" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
