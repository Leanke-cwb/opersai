import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabase/client";

export default function ProtectedRoute({
  children,
  perfisPermitidos,
}) {
  const [loading, setLoading] = useState(true);
  const [autorizado, setAutorizado] = useState(false);

  useEffect(() => {
    verificarPermissao();
  }, []);

  async function verificarPermissao() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("usuarios")
      .select("perfil")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      setLoading(false);
      return;
    }

   setAutorizado(
  (perfisPermitidos ?? []).includes(data.perfil)
);

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        Carregando...
      </div>
    );
  }

  if (!autorizado) {
    return <Navigate to="/home" replace />;
  }

  return children;
}