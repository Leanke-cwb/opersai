import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";

export default function ChefeNucleo() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      // Busca o núcleo do chefe
      const { data: chefe, error: erroChefe } = await supabase
        .from("usuarios")
        .select("nucleo_id")
        .eq("user_id", user.id)
        .single();

      if (erroChefe || !chefe) {
        alert("Não foi possível identificar o núcleo.");
        return;
      }

      // Busca apenas usuários do mesmo núcleo
      const { data, error } = await supabase
        .from("usuarios")
        .select(`
          *,
          nucleos (
            nome
          )
        `)
        .eq("nucleo_id", chefe.nucleo_id)
        .order("nome");

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setUsuarios(data || []);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  }

  function atualizarCampo(id, campo, valor) {
    setUsuarios((prev) =>
      prev.map((u) =>
        u.id === id
          ? {
              ...u,
              [campo]: valor,
            }
          : u
      )
    );
  }

  async function aprovarUsuario(id) {
    const { error } = await supabase
      .from("usuarios")
      .update({
        ativo: true,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarUsuarios();
  }

  async function bloquearUsuario(id) {
    const confirmar = window.confirm(
      "Deseja bloquear este usuário?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios")
      .update({
        ativo: false,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarUsuarios();
  }

  async function salvarUsuario(usuario) {
    const { error } = await supabase
      .from("usuarios")
      .update({
        nome: usuario.nome,
        cpf: usuario.cpf,
        telefone: usuario.telefone,
        posto_graduacao: usuario.posto_graduacao,
      })
      .eq("id", usuario.id);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Usuário atualizado com sucesso.");
    carregarUsuarios();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6">

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            Painel do Chefe de Núcleo
          </h1>

          <button
            onClick={() => navigate("/home")}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Voltar
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10">
            Carregando usuários...
          </div>
        ) : (
          <div className="overflow-auto">

            <table className="w-full border-collapse border">

              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Nome</th>
                  <th className="border p-2">Email</th>
                  <th className="border p-2">CPF</th>
                  <th className="border p-2">Telefone</th>
                  <th className="border p-2">
                    Posto/Graduação
                  </th>
                  <th className="border p-2">Núcleo</th>
                  <th className="border p-2">Status</th>
                  <th className="border p-2">Ações</th>
                </tr>
              </thead>

              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id}>

                    <td className="border p-2">
                      <input
                        value={usuario.nome || ""}
                        onChange={(e) =>
                          atualizarCampo(
                            usuario.id,
                            "nome",
                            e.target.value
                          )
                        }
                        className="border rounded p-1 w-full"
                      />
                    </td>

                    <td className="border p-2">
                      {usuario.email}
                    </td>

                    <td className="border p-2">
                      <input
                        value={usuario.cpf || ""}
                        onChange={(e) =>
                          atualizarCampo(
                            usuario.id,
                            "cpf",
                            e.target.value
                          )
                        }
                        className="border rounded p-1 w-full"
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        value={usuario.telefone || ""}
                        onChange={(e) =>
                          atualizarCampo(
                            usuario.id,
                            "telefone",
                            e.target.value
                          )
                        }
                        className="border rounded p-1 w-full"
                      />
                    </td>

                    <td className="border p-2">
                      <input
                        value={
                          usuario.posto_graduacao || ""
                        }
                        onChange={(e) =>
                          atualizarCampo(
                            usuario.id,
                            "posto_graduacao",
                            e.target.value
                          )
                        }
                        className="border rounded p-1 w-full"
                      />
                    </td>

                    <td className="border p-2">
                      {usuario.nucleos?.nome || "-"}
                    </td>

                    <td className="border p-2">
                      {usuario.ativo
                        ? "Ativo"
                        : "Pendente"}
                    </td>

                    <td className="border p-2">
                      <div className="flex gap-2 flex-wrap">

                        <button
                          onClick={() =>
                            salvarUsuario(usuario)
                          }
                          className="bg-green-600 text-white px-3 py-1 rounded"
                        >
                          Salvar
                        </button>

                        {!usuario.ativo && (
                          <button
                            onClick={() =>
                              aprovarUsuario(
                                usuario.id
                              )
                            }
                            className="bg-blue-600 text-white px-3 py-1 rounded"
                          >
                            Aprovar
                          </button>
                        )}

                        {usuario.ativo && (
                          <button
                            onClick={() =>
                              bloquearUsuario(
                                usuario.id
                              )
                            }
                            className="bg-red-600 text-white px-3 py-1 rounded"
                          >
                            Bloquear
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

            {usuarios.length === 0 && (
              <div className="text-center py-8">
                Nenhum usuário encontrado.
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}