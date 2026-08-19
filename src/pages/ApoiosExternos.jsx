import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

function formatarData(data) {
  if (!data) return "-";

  const partes = String(data).split("-");
  if (partes.length !== 3) return data;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHora(hora) {
  if (!hora) return "-";
  return String(hora).slice(0, 5);
}

function textoSeguro(valor) {
  return String(valor || "").trim();
}

export default function ApoiosExternos() {
  const navigate = useNavigate();

  const [apoios, setApoios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [excluindoId, setExcluindoId] = useState(null);

  useEffect(() => {
    carregarApoios();
  }, []);

  async function carregarApoios() {
    try {
      setLoading(true);
      setErro("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase
        .from("apoios_externos")
        .select(`
          id,
          orgao,
          unidade,
          nome_operacao,
          numero_procedimento,
          data,
          hora,
          local,
          cidade,
          comandante_nome,
          comandante_posto_graduacao,
          status,
          etapa,
          created_at,
          updated_at,
          finalizado_em
        `)
        .order("data", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setApoios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar apoios externos:", error);
      setErro(error?.message || "Não foi possível carregar os apoios externos.");
      setApoios([]);
    } finally {
      setLoading(false);
    }
  }

  async function excluirApoio(apoio) {
    if (!apoio?.id || excluindoId) return;

    const identificacao =
      apoio.nome_operacao || apoio.numero_procedimento || apoio.orgao || "este apoio";

    const confirmado = window.confirm(
      `Confirma a exclusão definitiva de ${identificacao}?\n\n` +
        "O registro e seus materiais serão excluídos do Supabase. Esta ação não pode ser desfeita."
    );

    if (!confirmado) return;

    try {
      setExcluindoId(apoio.id);

      const { error } = await supabase
        .from("apoios_externos")
        .delete()
        .eq("id", apoio.id);

      if (error) throw error;

      setApoios((atuais) => atuais.filter((item) => item.id !== apoio.id));
    } catch (error) {
      console.error("Erro ao excluir apoio externo:", error);
      alert(error?.message || "Não foi possível excluir o apoio.");
    } finally {
      setExcluindoId(null);
    }
  }

  const apoiosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return apoios.filter((apoio) => {
      const correspondeStatus =
        status === "todos" || apoio.status === status;

      if (!correspondeStatus) return false;
      if (!termo) return true;

      const campos = [
        apoio.orgao,
        apoio.unidade,
        apoio.nome_operacao,
        apoio.numero_procedimento,
        apoio.local,
        apoio.cidade,
        apoio.comandante_nome,
      ];

      return campos.some((campo) =>
        textoSeguro(campo).toLowerCase().includes(termo)
      );
    });
  }, [apoios, busca, status]);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Apoios Externos</h1>
            <p className="text-gray-600 mt-1">
              Consulta dos apoios realizados a outros órgãos.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={carregarApoios}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Atualizar
            </button>
            <button
              onClick={() => navigate("/home")}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Pesquisar
            </label>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Órgão, unidade, operação, procedimento, cidade..."
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-white"
            >
              <option value="todos">Todos</option>
              <option value="finalizado">Finalizados</option>
              <option value="rascunho">Rascunhos</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Carregando apoios...</div>
        ) : erro ? (
          <div className="border border-red-300 bg-red-50 text-red-700 rounded p-4">
            <p className="font-semibold">Não foi possível carregar os apoios.</p>
            <p className="text-sm mt-1">{erro}</p>
          </div>
        ) : apoiosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Nenhum apoio encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border-b px-3 py-3">Data</th>
                  <th className="border-b px-3 py-3">Órgão / Unidade</th>
                  <th className="border-b px-3 py-3">Operação / Procedimento</th>
                  <th className="border-b px-3 py-3">Local</th>
                  <th className="border-b px-3 py-3">Comandante</th>
                  <th className="border-b px-3 py-3 text-center">Status</th>
                  <th className="border-b px-3 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {apoiosFiltrados.map((apoio) => (
                  <tr key={apoio.id} className="hover:bg-gray-50">
                    <td className="border-b px-3 py-3 whitespace-nowrap">
                      <div>{formatarData(apoio.data)}</div>
                      <div className="text-sm text-gray-500">
                        {formatarHora(apoio.hora)}
                      </div>
                    </td>

                    <td className="border-b px-3 py-3">
                      <div className="font-semibold">{apoio.orgao || "-"}</div>
                      <div className="text-sm text-gray-500">
                        {apoio.unidade || "-"}
                      </div>
                    </td>

                    <td className="border-b px-3 py-3">
                      <div>{apoio.nome_operacao || "-"}</div>
                      <div className="text-sm text-gray-500">
                        {apoio.numero_procedimento || "-"}
                      </div>
                    </td>

                    <td className="border-b px-3 py-3">
                      {[apoio.local, apoio.cidade].filter(Boolean).join(" - ") || "-"}
                    </td>

                    <td className="border-b px-3 py-3">
                      {[
                        apoio.comandante_posto_graduacao,
                        apoio.comandante_nome,
                      ]
                        .filter(Boolean)
                        .join(" ") || "-"}
                    </td>

                    <td className="border-b px-3 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          apoio.status === "finalizado"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {apoio.status === "finalizado" ? "Finalizado" : "Rascunho"}
                      </span>
                    </td>

                    <td className="border-b px-3 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => navigate(`/apoios-externos/${apoio.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                        >
                          Visualizar
                        </button>
                        <button
                          onClick={() => excluirApoio(apoio)}
                          disabled={excluindoId === apoio.id}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-3 py-2 rounded"
                        >
                          {excluindoId === apoio.id ? "Excluindo..." : "Excluir"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !erro && (
          <div className="mt-4 text-sm text-gray-500">
            Exibindo {apoiosFiltrados.length} de {apoios.length} apoio(s).
          </div>
        )}
      </div>
    </div>
  );
}
