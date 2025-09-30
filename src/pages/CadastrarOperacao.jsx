import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";

export default function CadastrarOperacao() {
  const [form, setForm] = useState({
    nome_operacao: "",
    numero_autos: "",
    vara: "",
  });
  const [operacoes, setOperacoes] = useState([]);
  const navigate = useNavigate();

  // Carrega operações do usuário
  useEffect(() => {
    async function carregarOperacoes() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data, error } = await supabase.from("operacoes").select("*");//.eq("user_id", user.id);
      if (!error) setOperacoes(data);
    }
    carregarOperacoes();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "nome_operacao" && value.length > 20) newValue = value.slice(0, 20);
    if (name === "vara" && value.length > 50) newValue = value.slice(0, 50);

    // Máscara automática para Número dos Autos
    if (name === "numero_autos") {
      const apenasNumeros = value.replace(/\D/g, "").slice(0, 20);
      let masked = "";
      for (let i = 0; i < apenasNumeros.length; i++) {
        masked += apenasNumeros[i];
        if (i === 6 || i === 8 || i === 12 || i === 13 || i === 15) masked += ".";
      }
      newValue = masked;
    }

    setForm({ ...form, [name]: newValue });
  };

  const validarNumeroAutos = (numero) => {
    const regex = /^\d{7}\.\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
    return regex.test(numero);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarNumeroAutos(form.numero_autos)) {
      alert("Número dos Autos inválido!");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    // Verifica duplicidade
    const { data: existente } = await supabase
      .from("operacoes")
      .select("*")
      .or(`nome_operacao.eq.${form.nome_operacao},numero_autos.eq.${form.numero_autos}`)
      .maybeSingle();

    if (existente) {
      alert("Já existe operação com esse nome ou número dos autos.");
      return;
    }

    const { error } = await supabase.from("operacoes").insert({ ...form, user_id: user.id });
    if (error) {
      alert("Erro ao cadastrar operação: " + error.message);
    } else {
      alert("Operação cadastrada com sucesso!");
      setForm({ nome_operacao: "", numero_autos: "", vara: "" });
      // Atualiza lista
      setOperacoes([...operacoes, { ...form, user_id: user.id }]);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir esta operação?")) return;
    const { error } = await supabase.from("operacoes").delete().eq("id", id);
    if (error) {
      alert("Erro ao excluir operação: " + error.message);
    } else {
      setOperacoes(operacoes.filter(op => op.id !== id));
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4 bg-white rounded-xl shadow-md mt-10">
      <button
        onClick={() => navigate("/home")}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
      >
        ← Voltar à Home
      </button>

      <h2 className="text-2xl font-bold mb-4">Cadastrar Operação</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">Nome da Operação</label>
          <input
            name="nome_operacao"
            value={form.nome_operacao}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            placeholder="Nome da operação"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-1">Número dos Autos</label>
          <input
            name="numero_autos"
            value={form.numero_autos}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            placeholder="0000000.00.0000.0.00.0000"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-1">Vara</label>
          <input
            name="vara"
            value={form.vara}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            placeholder="Vara"
            required
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Salvar
        </button>
      </form>

      <h3 className="text-xl font-bold mt-6">Operações Cadastradas</h3>
      <ul className="space-y-2">
        {operacoes.map(op => (
          <li key={op.id} className="flex justify-between items-center border p-2 rounded">
            <span>{op.nome_operacao} | {op.numero_autos}</span>
            <button
              onClick={() => handleDelete(op.id)}
              className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
