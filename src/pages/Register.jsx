import { useState } from "react";
import { supabase } from "../supabase/client";

const GRADUACOES_PM = [
  "Soldado",
  "Cabo",
  "3º Sargento",
  "2º Sargento",
  "1º Sargento",
  "Subtenente",
  "Aspirante",
  "2º Tenente",
  "1º Tenente",
  "Capitão",
  "Major",
  "Tenente-Coronel",
  "Coronel",
];

function formatCPF(cpf) {
  const cleaned = cpf.replace(/\D/g, "").slice(0, 11);
  return cleaned
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2}).*/, "$1.$2.$3-$4");
}

export default function Register() {
  const [form, setForm] = useState({
    posto_graduacao: "",
    nome: "",
    cpf: "",
    email: "",
    senha: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "cpf") value = formatCPF(value);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (
      !form.posto_graduacao ||
      !form.nome ||
      !form.cpf ||
      !form.email ||
      !form.senha
    ) {
      alert("Preencha todos os campos");
      return;
    }

    setLoading(true);

    try {
      // Redirecionamento fixo para o site de produção
      const redirectUrl = "https://opersai.onrender.com";

      // 1️⃣ Cria usuário no Auth
      const { data: authUser, error: signUpError } = await supabase.auth.signUp(
        {
          email: form.email,
          password: form.senha,
          options: { emailRedirectTo: redirectUrl },
        }
      );

      if (signUpError) {
        alert("Erro no cadastro: " + signUpError.message);
        setLoading(false);
        return;
      }

      if (!authUser.user) {
        alert("Cadastro não pôde ser concluído. Verifique o e-mail informado.");
        setLoading(false);
        return;
      }

      // 2️⃣ Checa duplicidade na tabela usuarios
      const { data: existing } = await supabase
        .from("usuarios")
        .select("id")
        .or(`email.eq.${form.email},cpf.eq.${form.cpf}`)
        .single();

      if (existing) {
        alert("Usuário com esse e-mail ou CPF já existe.");
        setLoading(false);
        return;
      }

      // 3️⃣ Insere dados na tabela usuarios com user_id do Auth
      const { error: dbError } = await supabase.from("usuarios").insert([
        {
          user_id: authUser.user.id,
          posto_graduacao: form.posto_graduacao,
          nome: form.nome,
          cpf: form.cpf,
          email: form.email,
        },
      ]);

      if (dbError) {
        alert("Erro ao salvar usuário na tabela: " + dbError.message);
        setLoading(false);
        return;
      }

      alert(
        "Cadastro realizado! Verifique seu e-mail para confirmação antes de logar."
      );

      setForm({ posto_graduacao: "", nome: "", cpf: "", email: "", senha: "" });
    } catch (err) {
      alert("Erro inesperado: " + (err.message || "Tente novamente."));
    } finally {
      setLoading(false);
    }
  };

  const voltarInicio = () => {
    window.location.href = "/";
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Cadastro</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <select
          name="posto_graduacao"
          value={form.posto_graduacao}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">Selecione a Graduação</option>
          {GRADUACOES_PM.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="nome"
          placeholder="Nome completo"
          value={form.nome}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          name="cpf"
          placeholder="CPF (000.000.000-00)"
          value={form.cpf}
          onChange={handleChange}
          maxLength={14}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail"
          value={form.email}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          name="senha"
          placeholder="Senha"
          value={form.senha}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>

      <button
        onClick={voltarInicio}
        className="w-full mt-4 bg-gray-500 text-white p-2 rounded"
      >
        Voltar à Página Inicial
      </button>
    </div>
  );
}
