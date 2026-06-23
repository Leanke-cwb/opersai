import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";

import CadastrarOperacao from "./pages/CadastrarOperacao";
import CadastrarAlvo from "./pages/CadastrarAlvo";
import ConsultaAlvos from "./pages/ConsultaAlvos";

import AutoCircunstanciado from "./pages/AutoCircunstanciado";
import GerarAutoCircunstanciado from "./pages/GerarAutoCircunstanciado";

import Cautela from "./pages/Cautela";

import GerarFormularioCelular from "./pages/GerarFormularioCelular";
import SelecionarCelular from "./pages/SelecionarCelular";

import SelecionarCustodia from "./pages/SelecionarCustodia";
import GerarCadeiaCustodia from "./pages/GerarCadeiaCustodia";

import AdminUsuarios from "./pages/AdminUsuarios";
import ChefeNucleo from "./pages/ChefeNucleo";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Home */}
        <Route path="/home" element={<Home />} />

        {/* Operações */}
        <Route path="/operacao" element={<CadastrarOperacao />} />

        {/* Alvos */}
        <Route path="/alvo" element={<CadastrarAlvo />} />
        <Route path="/consulta-alvos" element={<ConsultaAlvos />} />

        {/* Auto Circunstanciado */}
        <Route
          path="/auto-circunstanciado"
          element={<AutoCircunstanciado />}
        />
        <Route
          path="/auto"
          element={<GerarAutoCircunstanciado />}
        />

        {/* Cautela */}
        <Route path="/cautela" element={<Cautela />} />

        {/* Celulares */}
        <Route
          path="/gerar-formulario-celular"
          element={<GerarFormularioCelular />}
        />
        <Route
          path="/selecionar-celular"
          element={<SelecionarCelular />}
        />

        {/* Cadeia de Custódia */}
        <Route
          path="/selecionar-custodia"
          element={<SelecionarCustodia />}
        />
        <Route
          path="/gerar-cadeia-custodia"
          element={<GerarCadeiaCustodia />}
        />

        {/* Administração */}
        
        <Route
  path="/admin"
  element={
    <ProtectedRoute perfilPermitido="admin">
      <AdminUsuarios />
    </ProtectedRoute>
  }
/>
        {/*Chefe de Núcleo */}
        <Route
  path="/chefe-nucleo"
  element={
    <ProtectedRoute
      perfisPermitidos={[
        "admin",
        "chefe_nucleo",
      ]}
    >
      <ChefeNucleo />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}