import { useState, useEffect } from "react";
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
    .replace(
      /^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2}).*/,
      "$1.$2.$3-$4"
    );
}

function formatTelefone(telefone) {
  const cleaned = telefone.replace(/\D/g, "").slice(0, 11);

  if (cleaned.length <= 10) {
    return cleaned.replace(
      /^(\d{2})(\d{4})(\d{0,4}).*/,
      "($1) $2-$3"
    );
  }

  return cleaned.replace(
    /^(\d{2})(\d{5})(\d{0,4}).*/,
    "($1) $2-$3"
  );
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [nucleos, setNucleos] = useState([]);

  const [form, setForm] = useState({
    posto_graduacao: "",
    nome: "",
    cpf: "",
    telefone: "",
    nucleo_id: "",
    email: "",
    senha: "",
  });

  useEffect(() => {
    carregarNucleos();
  }, []);

  async function carregarNucleos() {
    const { data, error } = await supabase
      .from("nucleos")
      .select("*")
      .eq("ativo", true)
      .order("nome");

    if (!error) {
      setNucleos(data);
    }
  }

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "cpf") {
      value = formatCPF(value);
    }

    if (name === "telefone") {
      value = formatTelefone(value);
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (
      !form.posto_graduacao ||
      !form.nome ||
      !form.cpf ||
      !form.telefone ||
      !form.nucleo_id ||
      !form.email ||
      !form.senha
    ) {
      alert("Preencha todos os campos.");
      return;
    }

    if (
      !form.email
        .toLowerCase()
        .endsWith("@pm.pr.gov.br")
    ) {
      alert(
        "Somente e-mails institucionais @pm.pr.gov.br podem realizar cadastro."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,

        options: {
          emailRedirectTo:
            `${window.location.origin}/login`,

          data: {
            nome: form.nome,
            cpf: form.cpf,
            telefone: form.telefone,
            posto_graduacao:
              form.posto_graduacao,
            nucleo_id: form.nucleo_id,
          },
        },
      });

      if (error) {
        alert(
          "Erro ao realizar cadastro: " +
            error.message
        );
        return;
      }

      alert(
        "Cadastro realizado com sucesso.\n\nVerifique seu e-mail institucional para confirmar a conta."
      );

      setForm({
        posto_graduacao: "",
        nome: "",
        cpf: "",
        telefone: "",
        nucleo_id: "",
        email: "",
        senha: "",
      });
    } catch (err) {
      alert(
        "Erro inesperado: " +
          (err.message || "Tente novamente.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <h2 className="text-2xl font-bold mb-4">
        Cadastro
      </h2>

      <form
        onSubmit={handleRegister}
        className="space-y-4"
      >
        <select
          name="posto_graduacao"
          value={form.posto_graduacao}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">
            Selecione a Graduação
          </option>

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
          placeholder="CPF"
          value={form.cpf}
          onChange={handleChange}
          maxLength={14}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="text"
          name="telefone"
          placeholder="Telefone"
          value={form.telefone}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        />

        <select
          name="nucleo_id"
          value={form.nucleo_id}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="">
            Selecione o Núcleo
          </option>

          {nucleos.map((nucleo) => (
            <option
              key={nucleo.id}
              value={nucleo.id}
            >
              {nucleo.nome}
            </option>
          ))}
        </select>

        <input
          type="email"
          name="email"
          placeholder="E-mail Institucional"
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
          {loading
            ? "Cadastrando..."
            : "Cadastrar"}
        </button>
      </form>
    </div>
  );
}