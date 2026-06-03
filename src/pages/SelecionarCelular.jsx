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

    const { data: alvo } = await supabase
      .from("alvos")
      .select("numero_alvo")
      .eq("id", alvoId)
      .single();

    if (!alvo) return;

    const { data } = await supabase
      .from("celulares")
      .select("*")
      .eq("numero_alvo", alvo.numero_alvo)
      .order("numero_item");

    setCelulares(data || []);
  }

  function abrirCelular(celular) {
    localStorage.setItem("celularSelecionado", JSON.stringify(celular));

    navigate("/gerar-formulario-celular");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Selecione o Celular</h1>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Item</th>
            <th>Marca</th>
            <th>Modelo</th>
            <th>IMEI</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {celulares.map((celular) => (
            <tr key={celular.id}>
              <td>{celular.numero_item}</td>
              <td>{celular.marca}</td>
              <td>{celular.modelo}</td>
              <td>{celular.imei1}</td>

              <td>
                <button
                  onClick={() => abrirCelular(celular)}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Abrir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
