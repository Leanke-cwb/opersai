import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";

const NOMES_TABELAS = {
  usuarios: "USUÁRIOS",
  operacoes: "OPERAÇÕES",
  alvos: "ALVOS",
  operacoes_compartilhadas: "COMPARTILHAMENTO DE OPERAÇÕES",
  cumprimento_mandado: "CUMPRIMENTO DE MANDADO",
  auto_circunstanciado: "AUTO CIRCUNSTANCIADO",
  auto_itens: "ITENS APREENDIDOS",
  materiais_apreendidos: "MATERIAIS APREENDIDOS",
  celulares: "CELULARES",
  operacoes_encerramento: "ENCERRAMENTO DA OPERAÇÃO",
  testemunhas: "TESTEMUNHAS",
  apoios_externos: "APOIOS EXTERNOS",
  apoio_itens: "ITENS DO APOIO",
};

const NOMES_ACOES = {
  INSERT: "CRIAÇÃO",
  UPDATE: "EDIÇÃO",
  DELETE: "EXCLUSÃO",
};

const CAMPOS_AMIGAVEIS = {
  nome: "Nome",
  nome_completo: "Nome completo",
  nome_operacao: "Operação",
  numero_alvo: "Número do alvo",
  numero_item: "Número do item",
  cpf: "CPF",
  email: "E-mail",
  perfil: "Perfil",
  ativo: "Ativo",
  posto_graduacao: "Posto/Graduação",
  telefone: "Telefone",
  descricao: "Descrição",
  quantidade: "Quantidade",
  quantidade_item: "Quantidade",
  lacre: "Lacre",
  local_encontrado: "Local encontrado",
  tipo_item: "Tipo de item",
  item_nome: "Item",
  tipo_categoria: "Categoria",
  numero_serie: "Número de série",
  patrimonio: "Patrimônio",
  orgao: "Órgão",
  unidade: "Unidade",
  cidade: "Cidade",
  local: "Local",
  responsavel_nome: "Responsável",
  responsavel_funcao: "Função do responsável",
  responsavel_documento: "CPF do responsável",
  status: "Status",
  etapa: "Etapa",
  encerrado: "Encerrado",
  houve_apreensao: "Houve apreensão",
  justificativa: "Justificativa",
  observacoes: "Observações",
  observacoes_entrega: "Observações da entrega",
  policiais_apoio: "Policiais de apoio",
  integrantes: "Integrantes",
  comandante_nome: "Comandante",
};

function nomeTabela(tabela) {
  return NOMES_TABELAS[tabela] || String(tabela || "-").replaceAll("_", " ").toUpperCase();
}

function nomeCampo(campo) {
  return CAMPOS_AMIGAVEIS[campo] || String(campo || "").replaceAll("_", " ");
}

function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "boolean") return valor ? "SIM" : "NÃO";
  if (Array.isArray(valor)) {
    if (valor.length === 0) return "—";
    return valor
      .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
      .join(", ");
  }
  if (typeof valor === "object") return JSON.stringify(valor, null, 2);
  return String(valor);
}

function formatarDataHora(valor) {
  if (!valor) return "-";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR");
}

export default function Auditoria() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtros, setFiltros] = useState({
    texto: "",
    acao: "",
    origem: "",
    tabela: "",
    dataInicio: "",
    dataFim: "",
  });

  useEffect(() => {
    carregarAuditoria();
  }, []);

  async function carregarAuditoria() {
    try {
      setLoading(true);
      setErro("");

      const { data, error } = await supabase
        .from("auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao carregar auditoria:", error);
      setErro(error?.message || "Não foi possível carregar a auditoria.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  const tabelasDisponiveis = useMemo(
    () => [...new Set(logs.map((item) => item.tabela).filter(Boolean))].sort(),
    [logs]
  );

  const logsFiltrados = useMemo(() => {
    const busca = filtros.texto.trim().toLowerCase();
    const inicio = filtros.dataInicio
      ? new Date(`${filtros.dataInicio}T00:00:00`)
      : null;
    const fim = filtros.dataFim
      ? new Date(`${filtros.dataFim}T23:59:59.999`)
      : null;

    return logs.filter((item) => {
      if (filtros.acao && item.acao !== filtros.acao) return false;
      if (filtros.origem && item.origem !== filtros.origem) return false;
      if (filtros.tabela && item.tabela !== filtros.tabela) return false;

      const data = item.created_at ? new Date(item.created_at) : null;
      if (inicio && (!data || data < inicio)) return false;
      if (fim && (!data || data > fim)) return false;

      if (busca) {
        const texto = [
          item.usuario_nome,
          item.usuario_email,
          item.usuario_perfil,
          item.registro_id,
          item.tabela,
          item.acao,
          item.origem,
          ...(Array.isArray(item.campos_alterados) ? item.campos_alterados : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!texto.includes(busca)) return false;
      }

      return true;
    });
  }, [logs, filtros]);

  function alterarFiltro(campo, valor) {
    setFiltros((anterior) => ({ ...anterior, [campo]: valor }));
  }

  function limparFiltros() {
    setFiltros({
      texto: "",
      acao: "",
      origem: "",
      tabela: "",
      dataInicio: "",
      dataFim: "",
    });
  }

  function renderizarAlteracoes(log) {
    const antes = log.dados_anteriores || {};
    const depois = log.dados_novos || {};
    const campos = Array.isArray(log.campos_alterados) ? log.campos_alterados : [];

    if (log.acao === "UPDATE" && campos.length > 0) {
      return (
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Campo</th>
                <th className="border p-2 text-left">Antes</th>
                <th className="border p-2 text-left">Depois</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((campo) => (
                <tr key={campo}>
                  <td className="border p-2 font-medium">{nomeCampo(campo)}</td>
                  <td className="border p-2 whitespace-pre-wrap break-words max-w-xs">
                    {formatarValor(antes[campo])}
                  </td>
                  <td className="border p-2 whitespace-pre-wrap break-words max-w-xs">
                    {formatarValor(depois[campo])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    const dados = log.acao === "DELETE" ? antes : depois;
    const chaves = Object.keys(dados || {});

    if (chaves.length === 0) {
      return <p className="text-sm text-gray-500 mt-2">Sem detalhes adicionais.</p>;
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-sm">
        {chaves.map((campo) => (
          <div key={campo} className="border rounded p-2 bg-gray-50">
            <span className="font-semibold">{nomeCampo(campo)}:</span>{" "}
            <span className="whitespace-pre-wrap break-words">{formatarValor(dados[campo])}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Auditoria do Sistema</h1>
            <p className="text-sm text-gray-600 mt-1">
              Histórico de criações, edições e exclusões registradas no OPERSAI.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={carregarAuditoria}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Atualizar
            </button>
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <input
            value={filtros.texto}
            onChange={(e) => alterarFiltro("texto", e.target.value)}
            placeholder="Usuário, e-mail, registro..."
            className="border rounded p-2 md:col-span-2"
          />

          <select
            value={filtros.acao}
            onChange={(e) => alterarFiltro("acao", e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Todas as ações</option>
            <option value="INSERT">Criação</option>
            <option value="UPDATE">Edição</option>
            <option value="DELETE">Exclusão</option>
          </select>

          <select
            value={filtros.origem}
            onChange={(e) => alterarFiltro("origem", e.target.value)}
            className="border rounded p-2"
          >
            <option value="">Todas as origens</option>
            <option value="WEB">Web</option>
            <option value="MOBILE">Mobile</option>
            <option value="DESCONHECIDO">Desconhecida</option>
          </select>

          <select
            value={filtros.tabela}
            onChange={(e) => alterarFiltro("tabela", e.target.value)}
            className="border rounded p-2 md:col-span-2"
          >
            <option value="">Todos os módulos</option>
            {tabelasDisponiveis.map((tabela) => (
              <option key={tabela} value={tabela}>
                {nomeTabela(tabela)}
              </option>
            ))}
          </select>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data inicial</label>
            <input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => alterarFiltro("dataInicio", e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Data final</label>
            <input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => alterarFiltro("dataFim", e.target.value)}
              className="border rounded p-2 w-full"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              onClick={limparFiltros}
              className="w-full bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Exibindo <strong>{logsFiltrados.length}</strong> de <strong>{logs.length}</strong> registros carregados.
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">Carregando auditoria...</div>
        ) : logsFiltrados.length === 0 ? (
          <div className="text-center py-10 text-gray-500">Nenhum registro encontrado.</div>
        ) : (
          <div className="space-y-3">
            {logsFiltrados.map((log) => (
              <details key={log.id} className="border rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer list-none p-4 hover:bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                    <div className="text-sm">
                      <div className="font-semibold">{formatarDataHora(log.created_at)}</div>
                      <div className="text-gray-500">{log.origem || "DESCONHECIDO"}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="font-semibold">{log.usuario_nome || "USUÁRIO NÃO IDENTIFICADO"}</div>
                      <div className="text-xs text-gray-500">
                        {log.usuario_email || "-"} {log.usuario_perfil ? `• ${log.usuario_perfil}` : ""}
                      </div>
                    </div>
                    <div>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          log.acao === "DELETE"
                            ? "bg-red-100 text-red-700"
                            : log.acao === "UPDATE"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-700"
                        }`}
                      >
                        {NOMES_ACOES[log.acao] || log.acao}
                      </span>
                    </div>
                    <div className="font-medium">{nomeTabela(log.tabela)}</div>
                    <div className="text-xs text-gray-500 break-all">
                      ID: {log.registro_id || "-"}
                    </div>
                  </div>
                </summary>

                <div className="border-t p-4 bg-gray-50">
                  {renderizarAlteracoes(log)}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
