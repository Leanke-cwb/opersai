// src/pages/SelecionarCustodia.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function SelecionarCustodia() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [itens, setItens] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [custodiantes, setCustodiantes] = useState({});

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const alvoId = localStorage.getItem("alvoId");
console.log("ALVO ID:", alvoId);

      if (!alvoId) {
        alert("Alvo não encontrado.");
        navigate(-1);
        return;
      }

      const { data: autos, error: autoError } = await supabase
  .from("auto_circunstanciado")
  .select("*")
  .eq("alvo_id", alvoId);

console.log("AUTO RESULT:", autos);
console.log("AUTO ERROR:", autoError);

if (autoError) {
  console.error(autoError);
  alert("Erro ao consultar auto.");
  return;
}

if (!autos || autos.length === 0) {
  alert("Nenhum auto encontrado.");
  return;
}

const auto = autos[0];

      const { data: itensData } = await supabase
        .from("auto_itens")
        .select("*")
        .eq("auto_id", auto.id)
        .order("numero_item");

      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select("*")
        .order("nome");

      setItens(itensData || []);
      setUsuarios(usuariosData || []);
    } catch (erro) {
      console.error(erro);
      alert("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  function alterarCustodiante(itemId, usuarioId) {
    setCustodiantes((prev) => ({
      ...prev,
      [itemId]: usuarioId,
    }));
  }

  function gerar() {
    if (itens.length === 0) {
      alert("Nenhum item encontrado.");
      return;
    }

    const faltando = itens.filter(
      (item) => !custodiantes[item.id]
    );

    if (faltando.length > 0) {
      alert(
        `Selecione o 2º custodiante para todos os itens.\n\nItens pendentes: ${faltando
          .map((i) => i.numero_item)
          .join(", ")}`
      );
      return;
    }

    localStorage.setItem(
      "custodiaSelecionados",
      JSON.stringify(custodiantes)
    );

    navigate("/gerar-cadeia-custodia");
  }

  if (loading) {
    return (
      <div className="p-6">
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          Seleção do 2º Custodiante
        </h1>

        <button
          onClick={() => navigate(-1)}
          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Voltar
        </button>
      </div>

      {itens.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
          Nenhum item encontrado para este Auto Circunstanciado.
        </div>
      ) : (
        <>
          {itens.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 mb-4 bg-white shadow"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <strong>Item:</strong> {item.numero_item}
                </div>

                <div>
                  <strong>Tipo:</strong> {item.tipo_item}
                </div>

                <div className="md:col-span-2">
                  <strong>Descrição:</strong>{" "}
                  {item.descricao || "-"}
                </div>

                <div>
                  <strong>Lacre:</strong>{" "}
                  {item.lacre || "-"}
                </div>
              </div>

              <div className="mt-4">
                <label className="font-semibold block mb-2">
                  2º Custodiante
                </label>

                <select
                  className="border rounded p-2 w-full"
                  value={custodiantes[item.id] || ""}
                  onChange={(e) =>
                    alterarCustodiante(
                      item.id,
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Selecione o custodiante...
                  </option>

                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.posto_graduacao} - {u.nome} - CPF: {u.cpf}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          <div className="mt-6">
            <button
              onClick={gerar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-semibold"
            >
              Gerar Cadeias de Custódia
            </button>
          </div>
        </>
      )}
    </div>
  );
}