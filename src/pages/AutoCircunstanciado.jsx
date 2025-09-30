import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";

export default function AutoCircunstanciado() {
  const [operacoes, setOperacoes] = useState([]);
  const [operacaoSelecionada, setOperacaoSelecionada] = useState(null);
  const [alvos, setAlvos] = useState([]);

  useEffect(() => {
    async function fetchOperacoes() {
      let { data, error } = await supabase
        .from("operacoes")
        .select("id, nome_operacao, numero_autos")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Erro ao buscar operações:", error);
      } else {
        setOperacoes(data);
      }
    }
    fetchOperacoes();
  }, []);

  useEffect(() => {
    async function fetchAlvos() {
      if (!operacaoSelecionada) {
        setAlvos([]);
        return;
      }
      let { data, error } = await supabase
        .from("alvos")
        .select("id, nome, numero_alvo")
        .eq("operacao_id", operacaoSelecionada.id);
      if (error) {
        console.error("Erro ao buscar alvos:", error);
      } else {
        setAlvos(data);
      }
    }
    fetchAlvos();
  }, [operacaoSelecionada]);

  function handleSelecionarOperacao(event) {
    const id = event.target.value;
    const operacao = operacoes.find((op) => op.id === id);
    setOperacaoSelecionada(operacao);
  }

  function gerarAuto(alvoId) {
    console.log("Gerar Auto para alvo:", alvoId);
  }

  function gerarCertidaoHash(alvoId) {
    console.log("Gerar Certidão de Hash para alvo:", alvoId);
  }

  function gerarCertidaoCumprimento(alvoId) {
    console.log("Gerar Certidão de Cumprimento para alvo:", alvoId);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
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
        <>
          <div className="mt-6 p-4 border rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Operação Selecionada</h2>
            <p>
              <strong>Nome:</strong> {operacaoSelecionada.nome_operacao}
            </p>
            <p>
              <strong>Autos:</strong> {operacaoSelecionada.numero_autos}
            </p>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">Alvos da Operação</h3>
            {alvos.length === 0 ? (
              <p>Sem alvos cadastrados para esta operação.</p>
            ) : (
              <table
                className="w-full table-auto border-collapse border border-gray-300"
                style={{ tableLayout: "auto" }}
              >
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-5 py-2 text-left max-w-xs break-words">
                      Nome do Alvo
                    </th>
                    <th className="border border-gray-300 px-5 py-2 text-center max-w-[100px] break-words">
                      Número do Alvo
                    </th>
                    <th className="border border-gray-300 px-5 py-2 text-center">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {alvos.map((alvo) => (
                    <tr key={alvo.id} className="hover:bg-gray-100">
                      <td className="border border-gray-300 px-4 py-2 max-w-xs break-words">
                        {alvo.nome}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 max-w-[100px] break-words text-center">
                        {alvo.numero_alvo}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => gerarAuto(alvo.id)}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Gerar Auto
                          </button>
                          <button
                            onClick={() => gerarCertidaoHash(alvo.id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          >
                            Certidão Hash
                          </button>
                          <button
                            onClick={() => gerarCertidaoCumprimento(alvo.id)}
                            className="bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                          >
                            Certidão Cumprimento
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
