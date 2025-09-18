import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "react-qr-code";

export default function ConsultaAlvos() {
  const navigate = useNavigate();

  const [operacoes, setOperacoes] = useState([]);
  const [operacaoSelecionada, setOperacaoSelecionada] = useState("");
  const [alvos, setAlvos] = useState([]);
  const [alvosSelecionados, setAlvosSelecionados] = useState([]);
  const [urlsAssinadas, setUrlsAssinadas] = useState({});

  const pdfContentRef = useRef();

  // Carrega operações do usuário logado
  useEffect(() => {
    async function carregarOperacoes() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Usuário não autenticado");
        return;
      }

      const { data, error } = await supabase
        .from("operacoes")
        .select("id, nome_operacao")
        //.eq("user_id", user.id);

      if (error) {
        console.error("Erro ao carregar operações", error);
      } else {
        setOperacoes(data);
      }
    }
    carregarOperacoes();
  }, []);

  // Carrega alvos da operação selecionada
  useEffect(() => {
    async function carregarAlvos() {
      if (!operacaoSelecionada) {
        setAlvos([]);
        setUrlsAssinadas({});
        return;
      }

      const { data, error } = await supabase
        .from("alvos")
        .select(`
          id,
          numero_alvo,
          nome,
          cpf,
          observacao_alvo,
          foto_alvo_url,
          endereco,
          bairro,
          cidade,
          latitude,
          longitude,
          qrcode_url,
          observacao_residencia,
          foto_residencia_url,
          operacao_id
        `)
        .eq("operacao_id", operacaoSelecionada);

      if (error) {
        console.error("Erro ao carregar alvos", error);
      } else {
        setAlvos(data);
        setAlvosSelecionados([]);
      }
    }
    carregarAlvos();
  }, [operacaoSelecionada]);

  // Gera URLs assinadas para imagens
  useEffect(() => {
    async function gerarUrls() {
      if (!alvos.length) {
        setUrlsAssinadas({});
        return;
      }

      const urls = {};

      for (const alvo of alvos) {
        urls[alvo.id] = {};

        if (alvo.foto_alvo_url) {
          let caminhoAlvo = alvo.foto_alvo_url;
          if (caminhoAlvo.includes("imagens-alvo/")) {
            caminhoAlvo = caminhoAlvo.split("imagens-alvo/")[1];
          }

          const { data, error } = await supabase.storage
            .from("imagens-alvo")
            .createSignedUrl(caminhoAlvo, 60);
          urls[alvo.id].fotoAlvo = error ? null : data.signedUrl;
        } else {
          urls[alvo.id].fotoAlvo = null;
        }

        if (alvo.foto_residencia_url) {
          let caminhoResidencia = alvo.foto_residencia_url;
          if (caminhoResidencia.includes("imagens-residencia/")) {
            caminhoResidencia = caminhoResidencia.split("imagens-residencia/")[1];
          }

          const { data, error } = await supabase.storage
            .from("imagens-residencia")
            .createSignedUrl(caminhoResidencia, 60);
          urls[alvo.id].fotoResidencia = error ? null : data.signedUrl;
        } else {
          urls[alvo.id].fotoResidencia = null;
        }
      }
      setUrlsAssinadas(urls);
    }
    gerarUrls();
  }, [alvos]);

  // Alterna seleção do alvo
  function toggleSelecionarAlvo(id) {
    setAlvosSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Aguarda imagens carregarem para html2canvas
  function waitForImagesToLoad(container) {
    const images = container.querySelectorAll("img");
    return Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) resolve();
            else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          })
      )
    );
  }

  // Gera o PDF
  async function gerarPDF() {
    if (alvosSelecionados.length === 0) {
      alert("Selecione ao menos um alvo para gerar o PDF.");
      return;
    }

    const input = document.getElementById("pdf-content");
    if (!input) {
      alert("Erro ao encontrar conteúdo para gerar PDF.");
      return;
    }

    await waitForImagesToLoad(input);

    const canvas = await html2canvas(input, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("relatorio_alvos.pdf");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto bg-white rounded-xl shadow-md mt-10">
      {/* Botão voltar home */}
      <button
        onClick={() => navigate("/home")}
        className="mb-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
      >
        ← Voltar à Home
      </button>

      <h2 className="text-3xl font-bold mb-6">Consulta de Alvos por Operação</h2>

      {/* Seleção operação */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-700">Operação</label>
        <select
          className="border p-2 rounded w-full"
          value={operacaoSelecionada}
          onChange={(e) => setOperacaoSelecionada(e.target.value)}
        >
          <option value="">Selecione a operação</option>
          {operacoes.map((op) => (
            <option key={op.id} value={op.id}>
              {op.nome_operacao}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de alvos */}
      {alvos.length > 0 && (
        <>
          <div className="mb-6 max-h-80 overflow-y-auto border rounded p-4">
            <h3 className="text-xl font-semibold mb-4">Alvos cadastrados:</h3>
            <ul>
              {alvos.map((alvo) => (
                <li key={alvo.id} className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={alvosSelecionados.includes(alvo.id)}
                    onChange={() => toggleSelecionarAlvo(alvo.id)}
                    className="mr-3"
                  />
                  <div>
                    <p className="font-semibold">
                      {alvo.numero_alvo} - {alvo.nome}
                    </p>
                    <p className="text-sm text-gray-600">{alvo.endereco}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {alvosSelecionados.length > 0 && (
            <>
              {/* Conteúdo PDF */}
              <div
                id="pdf-content"
                ref={pdfContentRef}
                style={{
                  width: "210mm",
                  minHeight: "297mm",
                  padding: "20mm",
                  backgroundColor: "white",
                  boxSizing: "border-box",
                }}
              >
                {/* Cabeçalho */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "20px",
                    borderBottom: "2px solid black",
                    paddingBottom: "10px",
                  }}
                >
                  <img
                    src="https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/PMPR.png"
                    alt="Logo Polícia Militar do Paraná"
                    style={{ height: "60px", objectFit: "contain" }}
                    crossOrigin="anonymous"
                  />
                  <div style={{ textAlign: "center", flexGrow: 1, margin: "0 20px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "18px" }}>
                      POLÍCIA MILITAR DO PARANÁ
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      CORREGEDORIA-GERAL
                    </div>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      SEÇÃO DE ASSUNTOS INTERNOS
                    </div>
                  </div>
                  <img
                    src="https://oehaedvsgsrgtkxpovrd.supabase.co/storage/v1/object/public/figuras/coger.png"
                    alt="Logo Corregedoria"
                    style={{ height: "60px", objectFit: "contain" }}
                    crossOrigin="anonymous"
                  />
                </div>

                <h1
                  style={{
                    textAlign: "center",
                    fontSize: "24px",
                    fontWeight: "bold",
                    marginBottom: "30px",
                  }}
                >
                  Operação {operacoes.find((op) => op.id === operacaoSelecionada)?.nome_operacao || "Relatório de Alvos"}
                </h1>

                {/* Alvos */}
                {alvos
                  .filter((a) => alvosSelecionados.includes(a.id))
                  .map((alvo) => (
                    <div
                      key={alvo.id}
                      style={{
                        pageBreakInside: "avoid",
                        marginBottom: "40px",
                        padding: "15px",
                        border: "1px solid #ddd",
                        borderRadius: "8px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        width: "100%",
                      }}
                    >
                      {/* Alvo, nome e cpf centralizados */}
                      <div style={{ textAlign: "center", marginBottom: "20px" }}>
                        <h2 style={{ fontSize: "20px", fontWeight: "600", margin: "0 0 5px" }}>
                          Alvo 0{alvo.numero_alvo}
                        </h2>
                        <p style={{ margin: "0" }}>
                          <strong>Nome:</strong> {alvo.nome || "-"}
                        </p>
                        <p style={{ margin: "0" }}>
                          <strong>CPF:</strong> {alvo.cpf || "-"}
                        </p>
                      </div>

                      {/* Foto do Alvo centralizada pequena + observação abaixo */}
                      <div style={{ textAlign: "center", marginBottom: "30px" }}>
                        {urlsAssinadas[alvo.id]?.fotoAlvo && (
                          <img
                            src={urlsAssinadas[alvo.id].fotoAlvo}
                            alt={`Foto do alvo ${alvo.numero_alvo}`}
                            style={{
                              maxWidth: "150px",
                              height: "auto",
                              borderRadius: "6px",
                              border: "1px solid #ccc",
                              marginBottom: "8px",
                              objectFit: "contain",
                              display: "inline-block", // garante centralização
                            }}
                            crossOrigin="anonymous"
                          />
                        )}
                        <p style={{ fontStyle: "italic", margin: "0" }}>
                          {alvo.observacao_alvo || "-"}
                        </p>
                      </div>

                      {/* Endereço, Bairro e Cidade acima da foto da residência */}
                      <div style={{ marginBottom: "12px", textAlign: "center", fontSize: "14px" }}>
                        <div>
                          <strong>Endereço:</strong> {alvo.endereco || "-"}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: "20px",
                            marginTop: "4px",
                          }}
                        >
                          <div>
                            <strong>Bairro:</strong> {alvo.bairro || "-"}
                          </div>
                          <div>
                            <strong>Cidade:</strong> {alvo.cidade || "-"}
                          </div>
                        </div>
                      </div>

                      {/* Foto da Residência maior à esquerda, QR Code à direita, observação da residência abaixo da foto */}
                      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                        {/* Foto residência ocupa maior parte */}
                        <div
                          style={{
                            flex: "1 1 70%",
                            border: "1px solid #ccc",
                            borderRadius: "6px",
                            padding: "8px",
                            boxSizing: "border-box",
                          }}
                        >
                          {urlsAssinadas[alvo.id]?.fotoResidencia && (
                            <img
                              src={urlsAssinadas[alvo.id].fotoResidencia}
                              alt={`Foto da residência do alvo ${alvo.numero_alvo}`}
                              style={{
                                width: "100%",
                                height: "auto",
                                objectFit: "contain",
                                borderRadius: "4px",
                                marginBottom: "10px",
                                maxHeight: "250px",
                              }}
                              crossOrigin="anonymous"
                            />
                          )}
                          <p style={{ fontStyle: "italic", margin: "0", textAlign: "center" }}>
                            {alvo.observacao_residencia || "-"}
                          </p>
                        </div>

                        {/* QR Code à direita */}
                        <div style={{ flex: "0 0 150px", textAlign: "center" }}>
                          {alvo.latitude && alvo.longitude && (
                            <>
                              <div style={{ marginBottom: "8px", fontWeight: "bold" }}>QR Code</div>
                              <QRCode value={`${alvo.latitude},${alvo.longitude}`} size={140} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              <button
                onClick={gerarPDF}
                className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
              >
                Gerar PDF dos Alvos Selecionados
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
