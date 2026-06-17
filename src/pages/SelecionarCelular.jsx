// src/pages/SelecionarCelular.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function SelecionarCelular() {
  const navigate = useNavigate();

  const [celulares, setCelulares] = useState([]);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
  const alvoId = localStorage.getItem("alvoId");

  if (!alvoId) return;

  // Busca o alvo
  const { data: alvo, error: alvoError } = await supabase
    .from("alvos")
    .select("numero_alvo, operacao_id")
    .eq("id", alvoId)
    .single();

  if (alvoError || !alvo) {
    console.error("Erro ao buscar alvo:", alvoError);
    return;
  }

  // Busca a operação do alvo
  const { data: operacao, error: operacaoError } = await supabase
    .from("operacoes")
    .select("nome_operacao")
    .eq("id", alvo.operacao_id)
    .single();

  if (operacaoError || !operacao) {
    console.error("Erro ao buscar operação:", operacaoError);
    return;
  }

  // Busca somente os celulares daquele alvo naquela operação
  const { data, error } = await supabase
    .from("celulares")
    .select("*")
    .eq("numero_alvo", String(alvo.numero_alvo))
    .eq("nome_operacao", operacao.nome_operacao)
    .order("numero_item");

  if (error) {
    console.error("Erro ao buscar celulares:", error);
    return;
  }

  setCelulares(data || []);
}

  function abrirCelular(celular) {
    localStorage.setItem("celularSelecionado", JSON.stringify(celular));

    navigate("/gerar-formulario-celular");
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Selecione o Celular</h1>

        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Voltar
        </button>
      </div>

      {celulares.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
          Nenhum celular encontrado para este alvo.
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-gray-300 px-3 py-2">Item</th>
              <th className="border border-gray-300 px-3 py-2">Marca</th>
              <th className="border border-gray-300 px-3 py-2">Modelo</th>
              <th className="border border-gray-300 px-3 py-2">IMEI</th>
              <th className="border border-gray-300 px-3 py-2">Ação</th>
            </tr>
          </thead>

          <tbody>
            {celulares.map((celular) => (
              <tr key={celular.id} className="hover:bg-gray-100">
                <td className="border border-gray-300 px-3 py-2 text-center">
                  {celular.numero_item}
                </td>

                <td className="border border-gray-300 px-3 py-2">
                  {celular.marca}
                </td>

                <td className="border border-gray-300 px-3 py-2">
                  {celular.modelo}
                </td>

                <td className="border border-gray-300 px-3 py-2">
                  {celular.imei1}
                </td>

                <td className="border border-gray-300 px-3 py-2 text-center">
                  <button
                    onClick={() => abrirCelular(celular)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                  >
                    Abrir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
