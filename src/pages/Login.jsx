import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

const BACKGROUND_IMAGE_URL =
  "https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/coger.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("Email ou senha incorretos.");
      return;
    }

    if (!data.user?.email_confirmed_at) {
      setErro("Por favor, confirme seu e-mail antes de fazer login.");
      return;
    }

    // Inserir dados extras se ainda não existirem
    const { data: existing } = await supabase
      .from("usuarios")
      .select("*")
      .eq("user_id", data.user.id)
      .single();

    if (!existing) {
      // Recupera dados temporários do localStorage
      const temp = JSON.parse(localStorage.getItem("cadastro_temp") || "{}");

      const { error: insertError } = await supabase.from("usuarios").insert([
        {
          user_id: data.user.id,
          posto_graduacao: temp.posto_graduacao || "",
          nome: temp.nome || "",
          cpf: temp.cpf || "",
          email: data.user.email,
        },
      ]);

      if (insertError)
        console.error("Erro ao salvar dados extras:", insertError.message);

      // Remove dados temporários
      localStorage.removeItem("cadastro_temp");
    }

    navigate("/home");
  };

  return (
    // ESTILOS DE FUNDO APLICADOS AQUI
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url('${BACKGROUND_IMAGE_URL}')`,
        backgroundSize: "contain",
        backgroundPosition: "center", // Centraliza a imagem
        backgroundRepeat: "no-repeat", // Evita repetição
      }}
    >
      <form
        onSubmit={handleLogin}
        // Adicionando bg-opacity-90 para destacar o fundo
        className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm bg-opacity-55"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {erro && <p className="text-red-500 text-sm mb-4">{erro}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (erro) setErro("");
          }}
          className="w-full p-2 border rounded mb-4"
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => {
            setSenha(e.target.value);
            if (erro) setErro("");
          }}
          className="w-full p-2 border rounded mb-4"
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Entrar
        </button>

        <div className="text-center mt-4">
          <span className="text-gray-600">Não tem conta? </span>
          <a href="/register" className="text-blue-600 hover:underline">
            Cadastre-se
          </a>
        </div>
      </form>
    </div>
  );
}
