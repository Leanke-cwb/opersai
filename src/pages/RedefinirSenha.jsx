import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import gecorLogo from "../assets/gecor-logo.png";

export default function RedefinirSenha() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [sessaoValida, setSessaoValida] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;

    const verificarSessao = async () => {
      const { data } = await supabase.auth.getSession();

      if (!ativo) return;

      setSessaoValida(Boolean(data.session));
      setVerificando(false);
    };

    verificarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return;

      if (event === "PASSWORD_RECOVERY" || session) {
        setSessaoValida(Boolean(session));
        setVerificando(false);
      }
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleRedefinirSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");

    if (novaSenha.length < 8) {
      setErro("A nova senha deve possuir pelo menos 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas informadas não são iguais.");
      return;
    }

    setSalvando(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (error) {
        console.error("Erro ao redefinir senha:", error);
        setErro("Não foi possível alterar a senha. Solicite um novo link de recuperação.");
        return;
      }

      setMensagem("Senha alterada com sucesso. Você já pode entrar com a nova senha.");
      setNovaSenha("");
      setConfirmarSenha("");

      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1800);
    } catch (err) {
      console.error("Erro ao redefinir senha:", err);
      setErro("Não foi possível concluir a redefinição da senha.");
    } finally {
      setSalvando(false);
    }
  };

  if (verificando) {
    return (
      <div className="gecor-login-page">
        <div className="gecor-login-shell">
          <section className="gecor-login-panel">
            <div className="gecor-login-form">
              <h2 className="gecor-login-title">Validando link...</h2>
              <p className="gecor-login-description">
                Aguarde enquanto o link de recuperação é validado.
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

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
          <form onSubmit={handleRedefinirSenha} className="gecor-login-form">
            <p className="gecor-login-eyebrow">Recuperação de acesso</p>
            <h2 className="gecor-login-title">Definir nova senha</h2>

            {!sessaoValida ? (
              <>
                <p className="gecor-login-error">
                  O link de recuperação é inválido ou expirou.
                </p>
                <p className="gecor-login-description">
                  Solicite um novo link para redefinir sua senha.
                </p>

                <button
                  type="button"
                  className="gecor-primary-button"
                  onClick={() => navigate("/recuperar-senha")}
                >
                  Solicitar novo link
                </button>
              </>
            ) : (
              <>
                <p className="gecor-login-description">
                  Informe e confirme a nova senha para concluir a recuperação do acesso.
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
                  <label className="gecor-form-label" htmlFor="nova-senha">
                    Nova senha
                  </label>
                  <input
                    id="nova-senha"
                    type="password"
                    placeholder="Digite a nova senha"
                    value={novaSenha}
                    onChange={(e) => {
                      setNovaSenha(e.target.value);
                      if (erro) setErro("");
                    }}
                    className="gecor-form-control"
                    required
                    minLength={8}
                    disabled={salvando}
                    autoComplete="new-password"
                  />
                </div>

                <div className="gecor-login-field">
                  <label className="gecor-form-label" htmlFor="confirmar-senha">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirmar-senha"
                    type="password"
                    placeholder="Digite novamente a nova senha"
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      if (erro) setErro("");
                    }}
                    className="gecor-form-control"
                    required
                    minLength={8}
                    disabled={salvando}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="gecor-primary-button"
                  disabled={salvando}
                >
                  {salvando ? "Alterando..." : "Alterar senha"}
                </button>
              </>
            )}

            <div className="gecor-login-register">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="gecor-text-button"
                disabled={salvando}
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
