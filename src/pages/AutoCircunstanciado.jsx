import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom"; // ✅ import para navegação

export default function AutoCircunstanciado() {
  const [operacoes, setOperacoes] = useState([]);
  const [operacaoSelecionada, setOperacaoSelecionada] = useState(null);
  const [alvos, setAlvos] = useState([]);
  const [encerramentos, setEncerramentos] = useState([]);
  const navigate = useNavigate(); // ✅ hook de navegação

  useEffect(() => {
    async function fetchOperacoes() {
      const { data, error } = await supabase
        .from("operacoes")
        .select("id, nome_operacao, numero_autos")
        .order("created_at", { ascending: false });

      if (error) console.error("Erro ao buscar operações:", error);
      else setOperacoes(data);
    }
    fetchOperacoes();
  }, []);

  useEffect(() => {
    if (!operacaoSelecionada) {
      setAlvos([]);
      setEncerramentos([]);
      return;
    }

    async function fetchDados() {
      try {
        const { data: alvosData, error: alvosError } = await supabase
          .from("alvos")
          .select("id, nome, numero_alvo")
          .eq("operacao_id", operacaoSelecionada.id);

        if (alvosError) throw alvosError;
        setAlvos(alvosData || []);

        const { data: encerramentosData, error: encerramentosError } =
          await supabase
            .from("operacoes_encerramento")
            .select(
              "id, alvo_id, encerrado, houve_apreensao, encerrado_em, medidas"
            )
            .eq("operacao_id", operacaoSelecionada.id);

        if (encerramentosError) throw encerramentosError;
        setEncerramentos(encerramentosData || []);
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      }
    }

    fetchDados();
  }, [operacaoSelecionada]);

  function getStatusAlvo(alvoId) {
    return encerramentos.find((e) => e.alvo_id === alvoId) || null;
  }

  async function fetchItens(alvoId) {
    const { data, error } = await supabase
      .from("materiais_apreendidos")
      .select("id, quantidade, descricao")
      .eq("alvo_id", alvoId);

    if (error) {
      console.error("Erro ao buscar itens apreendidos:", error);
      return [];
    }
    return data || [];
  }

  // ✅ função para navegar para a tela de cautela
  const handleCautela = async (alvo) => {
    const itens = await fetchItens(alvo.id);
    localStorage.setItem("itensApreendidos", JSON.stringify(itens));
    localStorage.setItem("nomeAlvo", alvo.nome || "");
    navigate("/cautela");
  };

  function handleSelecionarOperacao(event) {
    const id = event.target.value;
    const operacao = operacoes.find((op) => op.id === id);
    setOperacaoSelecionada(operacao);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl mb-6 font-bold">Gerar Documentação</h1>

      <label htmlFor="operacao-select" className="block mb-2">
        Selecione a Operação:
      </label>
      <select
        id="operacao-select"
        className="w-full p-2 border rounded"
        onChange={handleSelecionarOperacao}
        defaultValue=""
      >
        <option value="" disabled>
          Selecione...
        </option>
        {operacoes.map((op) => (
          <option key={op.id} value={op.id}>
            {op.nome_operacao} - Autos: {op.numero_autos}
          </option>
        ))}
      </select>

      {operacaoSelecionada && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            Alvos da operação: {operacaoSelecionada.nome_operacao}
          </h2>

          {alvos.length === 0 ? (
            <p>Sem alvos cadastrados para esta operação.</p>
          ) : (
            <table className="w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Nome do Alvo
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center">
                    Nº do Alvo
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center">
                    Ações / Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {alvos.map((alvo) => {
                  const status = getStatusAlvo(alvo.id);
                  return (
                    <tr key={alvo.id} className="hover:bg-gray-100">
                      <td className="border border-gray-300 px-4 py-2">
                        {alvo.nome}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {alvo.numero_alvo}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <div className="flex flex-row flex-wrap justify-center items-center gap-2">
                          <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                            Auto
                          </button>
                          <button className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                            Hash
                          </button>
                          <button className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600">
                            Cumprimento
                          </button>
                          <button className="bg-pink-500 text-white px-3 py-1 rounded hover:bg-pink-600">
                            Custódia
                          </button>

                          {/* ✅ botão Cautela agora navega */}
                          <button
                            onClick={() => handleCautela(alvo)}
                            className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                          >
                            Cautela
                          </button>

                          {status?.encerrado ? (
                            <span className="text-green-600 font-semibold text-sm ml-3">
                              ✅ Encerrada
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm ml-3">
                              ⏳ Em andamento
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
