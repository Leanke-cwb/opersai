import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { useNavigate } from "react-router-dom";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    setLoading(true);

    const { data, error } = await supabase
      .from("usuarios")
      .select(`
        *,
        nucleos (
          nome
        )
      `)
      .order("nome");

    if (error) {
      console.error(error);
      alert("Erro ao carregar usuários.");
    } else {
      setUsuarios(data || []);
    }

    setLoading(false);
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
      "Deseja realmente bloquear este usuário?"
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

  async function tornarAdministrador(id) {
    const confirmar = window.confirm(
      "Deseja tornar este usuário administrador?"
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios")
      .update({
        perfil: "admin",
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarUsuarios();
  }

  async function removerAdministrador(id) {
  const confirmar = window.confirm(
    "Deseja remover o perfil de administrador?"
  );

  if (!confirmar) return;

  const { error } = await supabase
    .from("usuarios")
    .update({
      perfil: "usuario",
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  carregarUsuarios();
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

async function salvarUsuario(usuario) {
  const { error } = await supabase
    .from("usuarios")
    .update({
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      telefone: usuario.telefone,
      posto_graduacao: usuario.posto_graduacao,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      nucleo_id: usuario.nucleo_id,
    })
    .eq("id", usuario.id);

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  alert("Usuário atualizado com sucesso.");
  carregarUsuarios();
}

async function excluirUsuario(id) {
  const confirmar = window.confirm(
    "Deseja realmente excluir este usuário?"
  );

  if (!confirmar) return;

       const { error } = await supabase
    .from("usuarios")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  carregarUsuarios();
}

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            Administração de Usuários
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
    <th className="border p-2">Posto/Graduação</th>
    <th className="border p-2">Núcleo</th>
    <th className="border p-2">Perfil</th>
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
  <input
    value={usuario.email || ""}
    onChange={(e) =>
      atualizarCampo(
        usuario.id,
        "email",
        e.target.value
      )
    }
    className="border rounded p-1 w-full"
  />
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
    value={usuario.posto_graduacao || ""}
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
  <input
    value={usuario.nucleos?.nome || ""}
    className="border rounded p-1 w-full bg-gray-100"
    disabled
  />
</td>

                    <td className="border p-2">
  <select
    value={usuario.perfil}
    onChange={(e) =>
      atualizarCampo(
        usuario.id,
        "perfil",
        e.target.value
      )
    }
    className="border rounded p-1"
  >
   <option value="usuario">
  Usuário
</option>

<option value="chefe_nucleo">
  Chefe de Núcleo
</option>

<option value="admin">
  Administrador
</option>
  </select>
</td>

                    <td className="border p-2">
  <select
    value={usuario.ativo ? "true" : "false"}
    onChange={(e) =>
      atualizarCampo(
        usuario.id,
        "ativo",
        e.target.value === "true"
      )
    }
    className="border rounded p-1"
  >
    <option value="true">
      Ativo
    </option>

    <option value="false">
      Bloqueado
    </option>
  </select>
</td>

                    <td className="border p-2">
  <div className="flex gap-2">

    <button
      onClick={() =>
        salvarUsuario(usuario)
      }
      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
    >
      Salvar
    </button>

    <button
      onClick={() =>
        excluirUsuario(usuario.id)
      }
      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
    >
      Excluir
    </button>

  </div>
</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {usuarios.length === 0 && (
              <div className="text-center py-6">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}