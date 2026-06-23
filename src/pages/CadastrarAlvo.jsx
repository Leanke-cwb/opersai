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
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const navigate = useNavigate();

  const carregarDados = async () => {

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();


  if (userError || !user) {
    alert("Usuário não autenticado");
    return;
  }


  setUsuarioLogado(user);



  const { data: ops, error: opError } = await supabase
    .from("operacoes")
    .select(`
      id,
      nome_operacao,
      numero_autos,
      user_id
    `)
    .order("nome_operacao");


  if (!opError) {
    setOperacoes(ops || []);
  }



  const { data: alvosData, error: alvoError } = await supabase
    .from("alvos")
    .select(`
      *,
      operacoes (
        nome_operacao,
        user_id
      )
    `)
    .order("nome");


  if (!alvoError) {
    setAlvos(alvosData || []);
  }

};

useEffect(() => {
  carregarDados();
}, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

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

    if (name === "numero_alvo" && value.length > 5)
      newValue = value.slice(0, 5);

    if (name === "nome" && value.length > 50) newValue = value.slice(0, 50);

    if (name === "observacao_alvo" && value.length > 255)
      newValue = value.slice(0, 255);

    if (name === "endereco" && value.length > 200)
      newValue = value.slice(0, 200);

    if (name === "bairro" && value.length > 100) newValue = value.slice(0, 100);

    if (name === "cidade" && value.length > 100) newValue = value.slice(0, 100);

    if (name === "latitude" && value.length > 11) newValue = value.slice(0, 11);

    if (name === "longitude" && value.length > 12)
      newValue = value.slice(0, 12);

    if (name === "observacao_residencia" && value.length > 255)
      newValue = value.slice(0, 255);

    setForm({ ...form, [name]: newValue });
  };

  const validarCPF = (cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);

  const uploadImagem = async (bucket, file) => {
    if (!file) return null;

    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) {
      alert(`Erro ao enviar imagem: ${error.message}`);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  };

 const handleEdit = (alvo) => {


  if (alvo.operacoes?.user_id !== usuarioLogado?.id) {

    alert(
      "Você não pode editar alvos de uma operação compartilhada."
    );

    return;
  }


  setForm({

    operacao_id: alvo.operacao_id,
    numero_alvo: alvo.numero_alvo,
    nome: alvo.nome,
    cpf: alvo.cpf,
    observacao_alvo: alvo.observacao_alvo,
    endereco: alvo.endereco,
    bairro: alvo.bairro,
    cidade: alvo.cidade,
    latitude: alvo.latitude,
    longitude: alvo.longitude,
    observacao_residencia: alvo.observacao_residencia,

  });


  setEditandoId(alvo.id);

};
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.operacao_id || !form.numero_alvo || !form.nome) {
      return alert("Preencha todos os campos obrigatórios.");
    }

    if (form.cpf && !validarCPF(form.cpf)) {
      return alert("CPF inválido! Use o formato 000.000.000-00");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return alert("Usuário não autenticado");

    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${form.latitude},${form.longitude}`;

    const fotoAlvoUrl = await uploadImagem("imagens-alvo", fotoAlvo);

    const fotoResidenciaUrl = await uploadImagem(
      "imagens-residencia",
      fotoResidencia,
    );

    let error;
    let data;

    if (editandoId) {
      ({ error } = await supabase
        .from("alvos")
        .update({
          ...form,
          foto_alvo_url: fotoAlvoUrl || undefined,
          foto_residencia_url: fotoResidenciaUrl || undefined,
          qrcode_url: qrUrl,
        })
        .eq("id", editandoId));

      if (error) {
        console.log("ERRO UPDATE:", error);
        alert("Erro ao editar alvo: " + JSON.stringify(error));
        return;
      }
      await carregarDados();

alert("Alvo atualizado com sucesso!");
setEditandoId(null);
    } else {
      console.log("ID:", editandoId);
  
      ({ error } = await supabase.from("alvos").insert([
  {
    ...form,
    foto_alvo_url: fotoAlvoUrl,
    foto_residencia_url: fotoResidenciaUrl,
    qrcode_url: qrUrl,
    user_id: user.id,
  },
]));

if (error) {
  return alert("Erro ao cadastrar alvo: " + error.message);
}

await carregarDados();

alert("Alvo cadastrado com sucesso!");
    }

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
  };

 const handleDelete = async (id) => {


  const alvo = alvos.find(
    (a) => a.id === id
  );


  if (!alvo) {

    alert("Alvo não encontrado");

    return;
  }



  if (alvo.operacoes?.user_id !== usuarioLogado?.id) {


    alert(
      "Você não pode excluir alvos de uma operação compartilhada."
    );


    return;

  }



  if (!confirm("Deseja realmente excluir este alvo?")) {

    return;

  }



  const { error } = await supabase
    .from("alvos")
    .delete()
    .eq("id", id);



  if (error) {

    alert(
      "Erro ao excluir alvo: " + error.message
    );

    return;

  }



  await carregarDados();


};
const alvosFiltrados = alvos.filter((alvo) =>
  alvo.nome?.toLowerCase().includes(busca.toLowerCase())
);

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow-md mt-10">
      <button
        onClick={() => navigate("/home")}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded flex items-center gap-2"
      >
        ← Voltar para a Home
      </button>

      <h2 className="text-2xl font-bold mb-6">
        {editandoId ? "Editar Alvo" : "Cadastrar Alvo"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium mb-1">
            Operação
          </label>
          <select
            name="operacao_id"
            value={form.operacao_id}
            onChange={handleChange}
            className="border p-2 w-full rounded"
            required
          >
            <option value="">Selecione a operação</option>
           {
operacoes.map((op)=>(

<option key={op.id} value={op.id}>
  {op.nome_operacao} - {op.numero_autos}
</option>

))
}
          </select>
        </div>

        <input
          name="numero_alvo"
          value={form.numero_alvo}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Número do Alvo"
          required
        />
        <input
          name="nome"
          value={form.nome}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Nome"
          required
        />
        <input
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="CPF"
        />

        <textarea
          name="observacao_alvo"
          value={form.observacao_alvo}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Observação do Alvo"
        />

        <input
          type="file"
          onChange={(e) => setFotoAlvo(e.target.files[0])}
          accept="image/*"
        />

        <input
          name="endereco"
          value={form.endereco}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Endereço"
        />
        <input
          name="bairro"
          value={form.bairro}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Bairro"
        />
        <input
          name="cidade"
          value={form.cidade}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Cidade"
        />
        <input
          name="latitude"
          value={form.latitude}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Latitude"
        />
        <input
          name="longitude"
          value={form.longitude}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Longitude"
        />

        <textarea
          name="observacao_residencia"
          value={form.observacao_residencia}
          onChange={handleChange}
          className="border p-2 w-full rounded"
          placeholder="Observação da Residência"
        />

        <input
          type="file"
          onChange={(e) => setFotoResidencia(e.target.files[0])}
          accept="image/*"
        />

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          {editandoId ? "Atualizar" : "Salvar"}
        </button>
      </form>
<input
  type="text"
  placeholder="Pesquisar alvo pelo nome..."
  value={busca}
  onChange={(e) => setBusca(e.target.value)}
  className="border p-2 w-full rounded mt-6"
/>

      <h3 className="text-xl font-bold mt-6">Alvos Cadastrados</h3>

      <ul className="space-y-2">
      {alvosFiltrados.map((a) => (
          <li
            key={a.id}
            className="flex justify-between items-center border p-2 rounded"
          >
            <span>
  <strong>{a.numero_alvo}</strong> - {a.nome}

  <br />

  <small className="text-gray-500">
    {a.operacoes?.nome_operacao}
  </small>
</span>

         <div className="flex gap-2">


{
a.operacoes?.user_id === usuarioLogado?.id && (

<button
 onClick={() => handleEdit(a)}
 className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
>
 Editar
</button>

)
}



{
a.operacoes?.user_id === usuarioLogado?.id && (

<button
 onClick={() => handleDelete(a.id)}
 className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
>
 Excluir
</button>

)
}


</div>
          </li>
        ))}
      </ul>
    </div>
  );
}