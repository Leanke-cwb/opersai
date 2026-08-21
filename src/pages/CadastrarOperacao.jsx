import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function CadastrarOperacao() {
  const [form, setForm] = useState({
    nome_operacao: "",
    numero_autos: "",
    vara: "",
  });

  const [operacoes, setOperacoes] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [usuarioLogado, setUsuarioLogado] = useState(null);

  const [nucleos, setNucleos] = useState([]);
  const [nucleosSelecionados, setNucleosSelecionados] = useState([]);
  const [compartilhandoId, setCompartilhandoId] = useState(null);
  const [salvandoCompartilhamento, setSalvandoCompartilhamento] = useState(false);

  const navigate = useNavigate();

  async function carregarOperacoes() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: usuario, error: erroUsuario } = await supabase
      .from("usuarios")
      .select("nucleo_id, perfil, ativo")
      .eq("user_id", user.id)
      .single();

    if (erroUsuario || !usuario || usuario.ativo === false) return;

    setUsuarioLogado({
      ...user,
      perfil: usuario.perfil,
      nucleo_id: usuario.nucleo_id,
    });

    const { data, error } = await supabase
      .from("operacoes")
      .select(`
        *,
        operacoes_compartilhadas(
          nucleo_id
        )
      `)
      .order("nome_operacao");

    if (error) {
      console.log("Erro ao carregar operações:", error);
      return;
    }

    // A RLS já limita as operações visíveis. Mantemos esta filtragem
    // como compatibilidade adicional com o comportamento anterior.
    let filtradas = data || [];

    if (usuario.perfil !== "admin") {
      filtradas = filtradas.filter((op) => {
        if (op.nucleo_id === usuario.nucleo_id) return true;

        return op.operacoes_compartilhadas?.some(
          (c) => c.nucleo_id === usuario.nucleo_id,
        );
      });
    }

    setOperacoes(filtradas);
  }

  async function carregarNucleos() {
    const { data, error } = await supabase
      .from("nucleos")
      .select("id, nome, ativo")
      .order("nome");

    if (!error) {
      setNucleos((data || []).filter((n) => n.ativo !== false));
    }
  }

  useEffect(() => {
    carregarOperacoes();
    carregarNucleos();
  }, []);

  const toggleNucleo = (id) => {
    setNucleosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "nome_operacao" && value.length > 20) {
      newValue = value.slice(0, 20);
    }

    if (name === "vara" && value.length > 50) {
      newValue = value.slice(0, 50);
    }

    if (name === "numero_autos") {
      const apenasNumeros = value.replace(/\D/g, "").slice(0, 20);
      let masked = "";

      for (let i = 0; i < apenasNumeros.length; i++) {
        masked += apenasNumeros[i];

        if (i === 6 || i === 8 || i === 12 || i === 13 || i === 15) {
          masked += ".";
        }
      }

      newValue = masked;
    }

    setForm({
      ...form,
      [name]: newValue,
    });
  };

  const validarNumeroAutos = (numero) => {
    const regex = /^\d{7}\.\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
    return regex.test(numero);
  };

  const podeAlterarOperacao = (op) => {
    if (usuarioLogado?.perfil === "admin") return true;

    if (
      usuarioLogado?.perfil === "chefe_nucleo" &&
      usuarioLogado.nucleo_id === op.nucleo_id
    ) {
      return true;
    }

    if (
      usuarioLogado?.perfil === "usuario" &&
      usuarioLogado.nucleo_id === op.nucleo_id &&
      op.user_id === usuarioLogado.id
    ) {
      return true;
    }

    return false;
  };

  const compartilhamentosDaOperacao = (operacao) =>
    (operacao?.operacoes_compartilhadas || [])
      .map((item) => item.nucleo_id)
      .filter(Boolean);

  const nomeNucleo = (id) =>
    nucleos.find((nucleo) => nucleo.id === id)?.nome || "Núcleo";

  const limparFormulario = () => {
    setForm({
      nome_operacao: "",
      numero_autos: "",
      vara: "",
    });
    setEditandoId(null);
    setNucleosSelecionados([]);
  };

  const handleEdit = (operacao) => {
    if (!podeAlterarOperacao(operacao)) {
      alert("Você não tem permissão para editar esta operação.");
      return;
    }

    setCompartilhandoId(null);
    setForm({
      nome_operacao: operacao.nome_operacao,
      numero_autos: operacao.numero_autos,
      vara: operacao.vara,
    });

    // Compartilhamento é gerenciado somente pelo botão da operação.
    setNucleosSelecionados([]);
    setEditandoId(operacao.id);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function sincronizarCompartilhamentos(
    operacaoId,
    nucleoOrigemId,
    selecionados,
  ) {
    const desejados = [
      ...new Set((selecionados || []).filter((id) => id && id !== nucleoOrigemId)),
    ];

    const { data: atuais, error: erroAtuais } = await supabase
      .from("operacoes_compartilhadas")
      .select("nucleo_id")
      .eq("operacao_id", operacaoId);

    if (erroAtuais) throw erroAtuais;

    const idsAtuais = (atuais || []).map((item) => item.nucleo_id);
    const adicionar = desejados.filter((id) => !idsAtuais.includes(id));
    const remover = idsAtuais.filter((id) => !desejados.includes(id));

    if (remover.length > 0) {
      const { error } = await supabase
        .from("operacoes_compartilhadas")
        .delete()
        .eq("operacao_id", operacaoId)
        .in("nucleo_id", remover);

      if (error) throw error;
    }

    if (adicionar.length > 0) {
      const { error } = await supabase.from("operacoes_compartilhadas").insert(
        adicionar.map((nucleoId) => ({
          operacao_id: operacaoId,
          nucleo_id: nucleoId,
        })),
      );

      if (error) throw error;
    }

    const { error: erroFlag } = await supabase
      .from("operacoes")
      .update({ compartilhada: desejados.length > 0 })
      .eq("id", operacaoId);

    if (erroFlag) throw erroFlag;
  }

  const abrirCompartilhamento = (operacao) => {
    if (!podeAlterarOperacao(operacao)) {
      alert("Você não tem permissão para compartilhar esta operação.");
      return;
    }

    setEditandoId(null);
    setCompartilhandoId(operacao.id);
    setNucleosSelecionados(compartilhamentosDaOperacao(operacao));
  };

  const cancelarCompartilhamento = () => {
    setCompartilhandoId(null);
    setNucleosSelecionados([]);
  };

  const salvarCompartilhamento = async (operacao) => {
    if (!podeAlterarOperacao(operacao)) {
      alert("Você não tem permissão para compartilhar esta operação.");
      return;
    }

    try {
      setSalvandoCompartilhamento(true);
      await sincronizarCompartilhamentos(
        operacao.id,
        operacao.nucleo_id,
        nucleosSelecionados,
      );

      alert(
        nucleosSelecionados.filter((id) => id !== operacao.nucleo_id).length > 0
          ? "Compartilhamento atualizado com sucesso!"
          : "Operação descompartilhada com sucesso!",
      );

      setCompartilhandoId(null);
      setNucleosSelecionados([]);
      await carregarOperacoes();
    } catch (error) {
      console.error("Erro ao atualizar compartilhamento:", error);
      alert("Erro ao atualizar compartilhamento: " + (error?.message || error));
    } finally {
      setSalvandoCompartilhamento(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarNumeroAutos(form.numero_autos)) {
      alert("Número dos Autos inválido!");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Usuário não autenticado.");
      return;
    }

    const { data: usuario, error: usuarioError } = await supabase
      .from("usuarios")
      .select("nucleo_id, ativo")
      .eq("user_id", user.id)
      .single();

    if (usuarioError || !usuario?.nucleo_id || usuario.ativo === false) {
      alert("Usuário sem núcleo vinculado ou inativo.");
      return;
    }

    if (editandoId) {
      const operacaoEditada = operacoes.find((op) => op.id === editandoId);

      if (!operacaoEditada || !podeAlterarOperacao(operacaoEditada)) {
        alert("Você não tem permissão para editar esta operação.");
        return;
      }

      const { error } = await supabase
        .from("operacoes")
        .update({
          nome_operacao: form.nome_operacao,
          numero_autos: form.numero_autos,
          vara: form.vara,
        })
        .eq("id", editandoId);

      if (error) {
        alert(error.message);
        return;
      }

      alert("Operação atualizada!");
      limparFormulario();
      await carregarOperacoes();
      return;
    }

    const { error } = await supabase
      .from("operacoes")
      .insert({
        nome_operacao: form.nome_operacao,
        numero_autos: form.numero_autos,
        vara: form.vara,
        user_id: user.id,
        nucleo_id: usuario.nucleo_id,
        compartilhada: false,
      });

    if (error) {
      alert("Erro ao cadastrar operação: " + error.message);
      return;
    }

    alert("Operação cadastrada com sucesso!");
    limparFormulario();
    await carregarOperacoes();
  };

  const handleDelete = async (id) => {
    const operacao = operacoes.find((op) => op.id === id);

    if (!operacao || !podeAlterarOperacao(operacao)) {
      alert("Você não tem permissão para excluir esta operação.");
      return;
    }

    if (!window.confirm("Deseja excluir esta operação?")) return;

    const { error } = await supabase.from("operacoes").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await carregarOperacoes();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto bg-white rounded-xl shadow mt-10">
      <button
        onClick={() => navigate("/home")}
        className="mb-4 bg-gray-300 px-4 py-2 rounded"
      >
        ← Voltar
      </button>

      <h2 className="text-2xl font-bold mb-5">
        {editandoId ? "Editar Operação" : "Cadastrar Operação"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="nome_operacao"
          value={form.nome_operacao}
          onChange={handleChange}
          placeholder="Nome da operação"
          className="border p-2 w-full rounded"
        />

        <input
          name="numero_autos"
          value={form.numero_autos}
          onChange={handleChange}
          placeholder="0000000.00.0000.0.00.0000"
          className="border p-2 w-full rounded"
        />

        <input
          name="vara"
          value={form.vara}
          onChange={handleChange}
          placeholder="Vara"
          className="border p-2 w-full rounded"
        />


        <div className="flex gap-2">
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            {editandoId ? "Salvar Alterações" : "Salvar"}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="bg-gray-500 text-white px-4 py-2 rounded"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>


      <h3 className="font-bold text-xl mt-8">Operações</h3>

      {operacoes.map((op) => {
        const idsCompartilhados = compartilhamentosDaOperacao(op);

        return (
          <div key={op.id} className="border p-3 mt-3 rounded">
            <div className="flex justify-between gap-4 items-start">
              <div>
                <div className="font-semibold">{op.nome_operacao}</div>

                {idsCompartilhados.length > 0 ? (
                  <div className="text-sm text-blue-700 mt-1">
                    Compartilhada com: {idsCompartilhados.map(nomeNucleo).join(", ")}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mt-1">Não compartilhada</div>
                )}
              </div>

              {podeAlterarOperacao(op) && (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => handleEdit(op)}
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() =>
                      compartilhandoId === op.id
                        ? cancelarCompartilhamento()
                        : abrirCompartilhamento(op)
                    }
                    className="bg-indigo-600 text-white px-2 py-1 rounded"
                  >
                    {compartilhandoId === op.id
                      ? "Fechar Compartilhamento"
                      : idsCompartilhados.length > 0
                        ? "Gerenciar Compartilhamento"
                        : "Compartilhar"}
                  </button>

                  <button
                    onClick={() => handleDelete(op.id)}
                    className="bg-red-600 text-white px-2 py-1 rounded"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>

            {compartilhandoId === op.id && (
              <div className="mt-4 border-t pt-4">
                <p className="text-sm text-gray-700 mb-3">
                  Marque os núcleos para compartilhar. Desmarque e salve para
                  descompartilhar.
                </p>

                <div className="bg-gray-50 border rounded p-3">
                  {nucleos.filter((nucleo) => nucleo.id !== op.nucleo_id).length === 0 ? (
                    <span className="text-gray-500">Nenhum outro núcleo disponível.</span>
                  ) : (
                    nucleos
                      .filter((nucleo) => nucleo.id !== op.nucleo_id)
                      .map((nucleo) => (
                        <label key={nucleo.id} className="block py-1">
                          <input
                            type="checkbox"
                            checked={nucleosSelecionados.includes(nucleo.id)}
                            onChange={() => toggleNucleo(nucleo.id)}
                            disabled={salvandoCompartilhamento}
                          />{" "}
                          {nucleo.nome}
                        </label>
                      ))
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => salvarCompartilhamento(op)}
                    disabled={salvandoCompartilhamento}
                    className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    {salvandoCompartilhamento ? "Salvando..." : "Salvar"}
                  </button>

                  <button
                    type="button"
                    onClick={cancelarCompartilhamento}
                    disabled={salvandoCompartilhamento}
                    className="bg-gray-500 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
