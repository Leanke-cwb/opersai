import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import gecorLogo from "../assets/gecor-logo.png";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();

  const handleRecuperarSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setEnviando(true);

    try {
      const emailNormalizado = email.trim().toLowerCase();

      if (!emailNormalizado) {
        setErro("Informe seu e-mail.");
        return;
      }
      console.log(
  "URL RESET:",
  `${window.location.origin}/redefinir-senha`
);

      const { error } = await supabase.auth.resetPasswordForEmail(
  emailNormalizado,
  {
    redirectTo: "https://gecor.onrender.com/redefinir-senha",
  }
);

      if (error) {
        console.error("Erro ao solicitar redefinição de senha:", error);
        setErro("Não foi possível enviar o e-mail de recuperação. Tente novamente.");
        return;
      }

      // Mensagem genérica para não revelar se o e-mail está ou não cadastrado.
      setMensagem(
        "Se este e-mail estiver cadastrado no GECOR, você receberá um link para redefinir sua senha."
      );
    } catch (err) {
      console.error("Erro ao recuperar senha:", err);
      setErro("Não foi possível solicitar a recuperação da senha.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="gecor-login-page">
      <div className="gecor-login-shell">
        <section className="gecor-login-identity" aria-label="Identidade GECOR">
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

          <div className="gecor-login-logo-wrap">
            <img
              src={gecorLogo}
              alt="Símbolo GECOR"
              className="gecor-login-logo"
            />
          </div>

          <p className="gecor-login-note">
            Gestão segura das operações e dos registros produzidos pela atividade correicional.
          </p>
        </section>

        <section className="gecor-login-panel">
          <form onSubmit={handleRecuperarSenha} className="gecor-login-form">
            <p className="gecor-login-eyebrow">Recuperação de acesso</p>
            <h2 className="gecor-login-title">Esqueci minha senha</h2>
            <p className="gecor-login-description">
              Informe o e-mail utilizado no cadastro. Enviaremos um link para redefinição da senha.
            </p>

            {erro && <p className="gecor-login-error">{erro}</p>}

            {mensagem && (
              <p
                className="gecor-login-description"
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.10)",
                }}
              >
                {mensagem}
              </p>
            )}

            <div className="gecor-login-field">
              <label className="gecor-form-label" htmlFor="recuperacao-email">
                E-mail
              </label>
              <input
                id="recuperacao-email"
                type="email"
                placeholder="seu.email@pm.pr.gov.br"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (erro) setErro("");
                  if (mensagem) setMensagem("");
                }}
                className="gecor-form-control"
                required
                disabled={enviando}
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="gecor-primary-button"
              disabled={enviando}
            >
              {enviando ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <div className="gecor-login-register">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="gecor-text-button"
                disabled={enviando}
              >
                Voltar para o login
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
