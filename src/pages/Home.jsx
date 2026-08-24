import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import gecorLogo from "../assets/gecor-logo.png";

export default function Home() {
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  useEffect(() => {
    let telaAtiva = true;

    async function carregarPerfil() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (telaAtiva) navigate("/", { replace: true });
          return;
        }

        const { data, error } = await supabase
          .from("usuarios")
          .select("perfil, ativo")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar perfil:", error);
          return;
        }

        if (!data?.ativo) {
          await supabase.auth.signOut();
          if (telaAtiva) navigate("/", { replace: true });
          return;
        }

        if (telaAtiva) {
          setPerfil(data?.perfil || "usuario");
        }
      } finally {
        if (telaAtiva) setCarregandoPerfil(false);
      }
    }

    carregarPerfil();

    return () => {
      telaAtiva = false;
    };
  }, [navigate]);

  const podeEditarUsuarios =
    perfil === "admin" || perfil === "chefe_nucleo";

  function abrirEdicaoUsuarios() {
    if (perfil === "admin") {
      navigate("/admin");
      return;
    }

    if (perfil === "chefe_nucleo") {
      navigate("/chefe-nucleo");
    }
  }

  return (
    <div className="gecor-home-page">
      <div className="gecor-home-shell">
        <header className="gecor-home-header">
          <div className="gecor-brand">
            <img
              src={gecorLogo}
              alt="GECOR"
              className="gecor-brand__logo"
            />
            <div>
              <h1 className="gecor-brand__name">GECOR</h1>
              <p className="gecor-brand__subtitle">
                Gestão Eletrônica de Correição, Operações e Registros
              </p>
            </div>
          </div>

          <div className="gecor-home-header-status" aria-label="Ambiente institucional">
            <span className="gecor-home-header-status__dot" />
            <span>Ambiente institucional</span>
          </div>
        </header>

        <main className="gecor-home-panel">
          <div className="gecor-home-intro">
            <div>
              <p className="gecor-home-eyebrow">Painel operacional</p>
              <h2 className="gecor-home-title">Painel Principal</h2>
              <p className="gecor-home-description">
                Selecione o módulo que deseja acessar.
              </p>
            </div>
            <div className="gecor-home-intro-mark" aria-hidden="true">
              G
            </div>
          </div>

          <section className="gecor-home-section" aria-labelledby="gecor-operacional">
            <div className="gecor-home-section-heading">
              <div>
                <h3 id="gecor-operacional">Operacional</h3>
                <p>Cadastro, consulta e produção documental.</p>
              </div>
              <span className="gecor-home-section-line" />
            </div>

            <div className="gecor-home-grid">
              <button
                onClick={() => navigate("/operacao")}
                className="gecor-home-card"
              >
                <span className="gecor-home-card__code">OP</span>
                <span className="gecor-home-card__content">
                  <span className="gecor-home-card__title">Operações</span>
                  <span className="gecor-home-card__desc">
                    Cadastro e gerenciamento de operações.
                  </span>
                </span>
                <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
              </button>

              <button
                onClick={() => navigate("/alvo")}
                className="gecor-home-card"
              >
                <span className="gecor-home-card__code">AL</span>
                <span className="gecor-home-card__content">
                  <span className="gecor-home-card__title">Cadastrar Alvo</span>
                  <span className="gecor-home-card__desc">
                    Inclusão e atualização de dados de alvos.
                  </span>
                </span>
                <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
              </button>

              <button
                onClick={() => navigate("/consulta-alvos")}
                className="gecor-home-card"
              >
                <span className="gecor-home-card__code">CO</span>
                <span className="gecor-home-card__content">
                  <span className="gecor-home-card__title">Consultar Alvos</span>
                  <span className="gecor-home-card__desc">
                    Consulta dos registros por operação.
                  </span>
                </span>
                <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
              </button>

              <button
                onClick={() => navigate("/apoios-externos")}
                className="gecor-home-card"
              >
                <span className="gecor-home-card__code">AP</span>
                <span className="gecor-home-card__content">
                  <span className="gecor-home-card__title">Apoios Externos</span>
                  <span className="gecor-home-card__desc">
                    Registro de apoios prestados a outros órgãos.
                  </span>
                </span>
                <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
              </button>

              <button
                onClick={() => navigate("/auto-circunstanciado")}
                className="gecor-home-card"
              >
                <span className="gecor-home-card__code">DC</span>
                <span className="gecor-home-card__content">
                  <span className="gecor-home-card__title">Documentação</span>
                  <span className="gecor-home-card__desc">
                    Auto circunstanciado e documentos operacionais.
                  </span>
                </span>
                <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </section>

          {!carregandoPerfil && podeEditarUsuarios && (
            <section className="gecor-home-section gecor-home-section--management" aria-labelledby="gecor-gestao">
              <div className="gecor-home-section-heading">
                <div>
                  <h3 id="gecor-gestao">Gestão e Controle</h3>
                  <p>Recursos administrativos e de rastreabilidade.</p>
                </div>
                <span className="gecor-home-section-line" />
              </div>

              <div className="gecor-home-grid gecor-home-grid--management">
                <button
                  onClick={() => navigate("/auditoria")}
                  className="gecor-home-card gecor-home-card--admin"
                >
                  <span className="gecor-home-card__code">AU</span>
                  <span className="gecor-home-card__content">
                    <span className="gecor-home-card__title">Auditoria</span>
                    <span className="gecor-home-card__desc">
                      Histórico e rastreabilidade das alterações.
                    </span>
                  </span>
                  <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
                </button>

                <button
                  onClick={abrirEdicaoUsuarios}
                  className="gecor-home-card gecor-home-card--admin"
                >
                  <span className="gecor-home-card__code">US</span>
                  <span className="gecor-home-card__content">
                    <span className="gecor-home-card__title">Editar Usuários</span>
                    <span className="gecor-home-card__desc">
                      Administração de usuários autorizados.
                    </span>
                  </span>
                  <span className="gecor-home-card__arrow" aria-hidden="true">→</span>
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
