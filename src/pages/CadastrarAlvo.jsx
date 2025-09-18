import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";

export default function CadastrarAlvo() {
  const [form, setForm] = useState({
    operacao_id: "",
    numero_alvo: "",
    nome: "",
    cpf: "",
    observacao_alvo: "",
    endereco: "",
    bairro: "",
    cidade: "",
    latitude: "",
    longitude: "",
    observacao_residencia: "",
  });

  const [fotoAlvo, setFotoAlvo] = useState(null);
  const [fotoResidencia, setFotoResidencia] = useState(null);
  const [operacoes, setOperacoes] = useState([]);
  const [alvos, setAlvos] = useState([]);
  const navigate = useNavigate();

  // Carrega operações e alvos do usuário
  useEffect(() => {
    async function carregarDados() {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return alert("Usuário não autenticado");

      const { data: ops, error: opError } = await supabase
        .from("operacoes")
        .select("id, nome_operacao")
        //.eq("user_id", user.id);

      if (!opError) setOperacoes(ops);

      const { data: alvosData, error: alvoError } = await supabase
        .from("alvos")
        .select("*")
        //.eq("user_id", user.id);

      if (!alvoError) setAlvos(alvosData);
    }
    carregarDados();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    // Máscara para CPF
    if (name === "cpf") {
      const apenasNumeros = value.replace(/\D/g, "").slice(0, 11);
      let masked = "";
      for (let i = 0; i < apenasNumeros.length; i++) {
        masked += apenasNumeros[i];
        if (i === 2 || i === 5) masked += ".";
        if (i === 8) masked += "-";
      }
      newValue = masked;
    }

    // Limita tamanho dos outros campos
    if (name === "numero_alvo" && value.length > 5) newValue = value.slice(0, 5);
    if (name === "nome" && value.length > 50) newValue = value.slice(0, 50);
    if (name === "observacao_alvo" && value.length > 255) newValue = value.slice(0, 255);
    if (name === "endereco" && value.length > 200) newValue = value.slice(0, 200);
    if (name === "bairro" && value.length > 100) newValue = value.slice(0, 100);
    if (name === "cidade" && value.length > 100) newValue = value.slice(0, 100);
    if (name === "latitude" && value.length > 11) newValue = value.slice(0, 11);
    if (name === "longitude" && value.length > 12) newValue = value.slice(0, 12);
    if (name === "observacao_residencia" && value.length > 255) newValue = value.slice(0, 255);

    setForm({ ...form, [name]: newValue });
  };

  const validarCPF = (cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);

  const uploadImagem = async (bucket, file) => {
    if (!file) return null;
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) return alert(`Erro ao enviar imagem: ${error.message}`), null;

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.operacao_id || !form.numero_alvo || !form.nome) {
      return alert("Preencha todos os campos obrigatórios.");
    }

    if (form.cpf && !validarCPF(form.cpf)) {
      return alert("CPF inválido! Use o formato 000.000.000-00");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return alert("Usuário não autenticado");

    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${form.latitude},${form.longitude}`;
    const fotoAlvoUrl = await uploadImagem("imagens-alvo", fotoAlvo);
    const fotoResidenciaUrl = await uploadImagem("imagens-residencia", fotoResidencia);

    const { data, error } = await supabase.from("alvos").insert([
      { ...form, foto_alvo_url: fotoAlvoUrl, foto_residencia_url: fotoResidenciaUrl, qrcode_url: qrUrl, user_id: user.id },
    ]);

    if (error) return alert("Erro ao cadastrar alvo: " + error.message);

    alert("Alvo cadastrado com sucesso!");
    setForm({
      operacao_id: "",
      numero_alvo: "",
      nome: "",
      cpf: "",
      observacao_alvo: "",
      endereco: "",
      bairro: "",
      cidade: "",
      latitude: "",
      longitude: "",
      observacao_residencia: "",
    });
    setFotoAlvo(null);
    setFotoResidencia(null);
    setAlvos([...alvos, data[0]]);
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este alvo?")) return;
    const { error } = await supabase.from("alvos").delete().eq("id", id);
    if (error) return alert("Erro ao excluir alvo: " + error.message);
    setAlvos(alvos.filter(a => a.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-md mt-10">
      <button
        onClick={() => navigate("/home")}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded flex items-center gap-2"
      >
        ← Voltar para a Home
      </button>

      <h2 className="text-2xl font-bold mb-6">Cadastrar Alvo</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">Operação</label>
          <select
            name="operacao_id"
            value={form.operacao_id}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            required
          >
            <option value="">Selecione a operação</option>
            {operacoes.map(op => (
              <option key={op.id} value={op.id}>{op.nome_operacao}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Número do Alvo</label>
          <input
            name="numero_alvo"
            value={form.numero_alvo}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            maxLength={5}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Nome</label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            maxLength={50}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">CPF</label>
          <input
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            maxLength={14}
            placeholder="000.000.000-00"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Observação do Alvo</label>
          <textarea
            name="observacao_alvo"
            value={form.observacao_alvo}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            maxLength={255}
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Foto do Alvo</label>
          <input type="file" onChange={e => setFotoAlvo(e.target.files[0])} accept="image/*" />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Endereço</label>
          <input name="endereco" value={form.endereco} onChange={handleChange} className="border p-2 w-full rounded" maxLength={200} />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Bairro</label>
          <input name="bairro" value={form.bairro} onChange={handleChange} className="border p-2 w-full rounded" maxLength={100} />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Cidade</label>
          <input name="cidade" value={form.cidade} onChange={handleChange} className="border p-2 w-full rounded" maxLength={100} />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Latitude</label>
          <input name="latitude" value={form.latitude} onChange={handleChange} className="border p-2 w-full rounded" maxLength={11} placeholder="-00.00000000" />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Longitude</label>
          <input name="longitude" value={form.longitude} onChange={handleChange} className="border p-2 w-full rounded" maxLength={12} placeholder="-00.00000000" />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Observação da Residência</label>
          <textarea name="observacao_residencia" value={form.observacao_residencia} onChange={handleChange} className="border p-2 w-full rounded" maxLength={255} />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">Foto da Residência</label>
          <input type="file" onChange={e => setFotoResidencia(e.target.files[0])} accept="image/*" />
        </div>

        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition">Salvar</button>
      </form>

      <h3 className="text-xl font-bold mt-6">Alvos Cadastrados</h3>
      <ul className="space-y-2">
        {alvos.map(a => (
          <li key={a.id} className="flex justify-between items-center border p-2 rounded">
            <span>{a.nome} | {a.cpf}</span>
            <button
              onClick={() => handleDelete(a.id)}
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
