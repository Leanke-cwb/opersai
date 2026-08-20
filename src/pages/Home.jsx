import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function Home() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  useEffect(() => {
    let telaAtiva = true;

    async function carregarPerfil() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (telaAtiva) navigate("/", { replace: true });
          return;
        }

        const { data, error } = await supabase
          .from("usuarios")
          .select("perfil, ativo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar perfil:", error);
          return;
        }

        if (!data?.ativo) {
          await supabase.auth.signOut();
          if (telaAtiva) navigate("/", { replace: true });
          return;
        }

        if (telaAtiva) {
          setPerfil(data?.perfil || "usuario");
        }
      } finally {
        if (telaAtiva) setCarregandoPerfil(false);
      }
    }

    carregarPerfil();

    return () => {
      telaAtiva = false;
    };
  }, [navigate]);

  const podeEditarUsuarios =
    perfil === "admin" || perfil === "chefe_nucleo";

  function abrirEdicaoUsuarios() {
    if (perfil === "admin") {
      navigate("/admin");
      return;
    }

    if (perfil === "chefe_nucleo") {
      navigate("/chefe-nucleo");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Painel Principal
        </h1>

        <div className="space-y-4">
          <button
            onClick={() => navigate("/operacao")}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition"
          >
            Cadastrar Operação
          </button>

          <button
            onClick={() => navigate("/alvo")}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
          >
            Cadastrar Alvo
          </button>

          <button
            onClick={() => navigate("/consulta-alvos")}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Consultar Alvos
          </button>

          <button
            onClick={() => navigate("/apoios-externos")}
            className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition"
          >
            Apoios Externos
          </button>

          <button
            onClick={() => navigate("/auto-circunstanciado")}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition"
          >
            Gerar Auto Circunstanciado
          </button>

          {!carregandoPerfil && podeEditarUsuarios && (
            <button
              onClick={() => navigate("/auditoria")}
              className="w-full bg-teal-700 text-white py-2 px-4 rounded hover:bg-teal-800 transition"
            >
              Auditoria
            </button>
          )}

          {!carregandoPerfil && podeEditarUsuarios && (
            <button
              onClick={abrirEdicaoUsuarios}
              className="w-full bg-slate-700 text-white py-2 px-4 rounded hover:bg-slate-800 transition"
            >
              Editar Usuários
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
