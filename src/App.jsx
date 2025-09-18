import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";

// Importe suas páginas adicionais
import CadastrarOperacao from "./pages/CadastrarOperacao";
import CadastrarAlvo from "./pages/CadastrarAlvo";
import ConsultaAlvos from "./pages/ConsultaAlvos";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />

        {/* Rotas das páginas adicionais */}
        <Route path="/operacao" element={<CadastrarOperacao />} />
        <Route path="/alvo" element={<CadastrarAlvo />} />
        <Route path="/consulta-alvos" element={<ConsultaAlvos />} />
      </Routes>
    </BrowserRouter>
  );
}
