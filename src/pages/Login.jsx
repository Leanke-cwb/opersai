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

    // Verifica se já existe cadastro complementar
    const { data: existing, error: selectError } = await supabase
      .from("usuarios")
      .select("*")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (selectError) {
      console.error(selectError);
      setErro("Erro ao verificar cadastro do usuário.");
      return;
    }

    // Primeiro acesso após confirmação do email
    if (!existing) {
      const metadata = data.user.user_metadata || {};

      const { error: insertError } = await supabase
        .from("usuarios")
        .insert([
          {
            user_id: data.user.id,
            posto_graduacao: metadata.posto_graduacao || "",
            nome: metadata.nome || "",
            cpf: metadata.cpf || "",
            telefone: metadata.telefone || "",
            nucleo_id: metadata.nucleo_id || null,
            email: data.user.email,

            perfil: "usuario",
            ativo: false,
          },
        ]);

      if (insertError) {
        console.error(insertError);

        setErro(
          "Erro ao concluir cadastro. Entre em contato com o administrador."
        );

        await supabase.auth.signOut();
        return;
      }

      await supabase.auth.signOut();

      setErro(
        "Cadastro criado com sucesso. Aguarde aprovação do administrador."
      );

      return;
    }

    // Usuário ainda não aprovado
if (!existing.ativo) {
  await supabase.auth.signOut();

  setErro(
    "Seu cadastro ainda não foi aprovado pelo administrador do sistema."
  );

  return;
}

// Administrador
if (existing.perfil === "admin") {
  navigate("/admin");
  return;
}

// Chefe de Núcleo
if (existing.perfil === "chefe_nucleo") {
  navigate("/chefe-nucleo");
  return;
}

// Usuário comum
navigate("/home");
};
return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundImage: `url('${BACKGROUND_IMAGE_URL}')`,
        backgroundSize: "contain",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm bg-opacity-55"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">
          Login
        </h2>

        {erro && (
          <p className="text-red-500 text-sm mb-4">
            {erro}
          </p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (erro) setErro("");
          }}
          className="w-full p-2 border rounded mb-4"
          required
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
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Entrar
        </button>

        <div className="text-center mt-4">
          <span className="text-gray-600">
            Não tem conta?
          </span>{" "}
          <button
  type="button"
  onClick={() => navigate("/register")}
  className="text-blue-600 hover:underline"
>
  Cadastre-se
</button>
        </div>
      </form>
    </div>
  );
}
