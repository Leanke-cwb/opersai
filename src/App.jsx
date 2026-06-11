import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import CadastrarOperacao from "./pages/CadastrarOperacao";
import CadastrarAlvo from "./pages/CadastrarAlvo";
import ConsultaAlvos from "./pages/ConsultaAlvos";
import AutoCircunstanciado from "./pages/AutoCircunstanciado";
import Cautela from "./pages/Cautela";
import GerarAutoCircunstanciado from "./pages/GerarAutoCircunstanciado";
import GerarFormularioCelular from "./pages/GerarFormularioCelular";
import SelecionarCelular from "./pages/SelecionarCelular";
import SelecionarCustodia from "./pages/SelecionarCustodia";
import GerarCadeiaCustodia from "./pages/GerarCadeiaCustodia";


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
        <Route path="/auto-circunstanciado" element={<AutoCircunstanciado />} />
        <Route path="/cautela" element={<Cautela />} />
        <Route path="/auto" element={<GerarAutoCircunstanciado />} />
        <Route
          path="/gerar-formulario-celular"
          element={<GerarFormularioCelular />}
        />
        <Route path="/selecionar-celular" element={<SelecionarCelular />} />
        <Route path="/selecionar-custodia" element={<SelecionarCustodia />} />
<Route path="/gerar-cadeia-custodia" element={<GerarCadeiaCustodia />} />
      </Routes>
    </BrowserRouter>
  );
}
