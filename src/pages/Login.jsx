import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/client";
import gecorLogo from "../assets/gecor-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    setEntrando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("Email ou senha incorretos.");
        return;
      }

      if (!data.user?.email_confirmed_at) {
        setErro("Por favor, confirme seu e-mail antes de fazer login.");
        return;
      }

      // Verifica se já existe cadastro complementar.
      const { data: existing, error: selectError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (selectError) {
        console.error(selectError);
        setErro("Erro ao verificar cadastro do usuário.");
        return;
      }

      // Primeiro acesso após confirmação do e-mail.
      if (!existing) {
        const metadata = data.user.user_metadata || {};

        const { error: insertError } = await supabase
          .from("usuarios")
          .insert([
            {
              user_id: data.user.id,
              posto_graduacao: metadata.posto_graduacao || "",
              nome: metadata.nome || "",
              cpf: metadata.cpf || "",
              telefone: metadata.telefone || "",
              nucleo_id: metadata.nucleo_id || null,
              email: data.user.email,
              perfil: "usuario",
              ativo: false,
            },
          ]);

        if (insertError) {
          console.error(insertError);
          setErro(
            "Erro ao concluir cadastro. Entre em contato com o administrador."
          );
          await supabase.auth.signOut();
          return;
        }

        await supabase.auth.signOut();
        setErro(
          "Cadastro criado com sucesso. Aguarde aprovação do administrador."
        );
        return;
      }

      // Usuário ainda não aprovado.
      if (!existing.ativo) {
        await supabase.auth.signOut();
        setErro(
          "Seu cadastro ainda não foi aprovado pelo administrador do sistema."
        );
        return;
      }

      /*
       * IMPORTANTE:
       * todos os usuários aprovados entram SEMPRE no Painel Principal.
       * O perfil não redireciona mais admin/chefe para páginas de usuários.
       * O acesso à edição de usuários acontece somente pelo botão da Home.
       */
      navigate("/home", { replace: true });
    } catch (err) {
      console.error("Erro no login:", err);
      setErro("Não foi possível concluir o login.");
    } finally {
      setEntrando(false);
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
          <form onSubmit={handleLogin} className="gecor-login-form">
            <p className="gecor-login-eyebrow">Acesso institucional</p>
            <h2 className="gecor-login-title">Entrar no sistema</h2>
            <p className="gecor-login-description">
              Utilize suas credenciais autorizadas para acessar o GECOR.
            </p>

            {erro && <p className="gecor-login-error">{erro}</p>}

            <div className="gecor-login-field">
              <label className="gecor-form-label" htmlFor="gecor-email">
                E-mail
              </label>
              <input
                id="gecor-email"
                type="email"
                placeholder="seu.email@pm.pr.gov.br"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (erro) setErro("");
                }}
                className="gecor-form-control"
                required
                disabled={entrando}
              />
            </div>

            <div className="gecor-login-field">
              <label className="gecor-form-label" htmlFor="gecor-senha">
                Senha
              </label>
              <input
                id="gecor-senha"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  if (erro) setErro("");
                }}
                className="gecor-form-control"
                required
                disabled={entrando}
              />
            </div>

            <button
              type="submit"
              className="gecor-primary-button"
              disabled={entrando}
            >
              {entrando ? "Entrando..." : "Entrar"}
            </button>

            <div className="gecor-login-register">
              <span>Não tem conta?</span>{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="gecor-text-button"
                disabled={entrando}
              >
                Cadastre-se
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
