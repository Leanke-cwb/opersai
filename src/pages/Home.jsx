import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Painel Principal</h1>
        <div className="space-y-4">
          <button onClick={() => navigate("/operacao")} className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition">Cadastrar Operação</button>
          <button onClick={() => navigate("/alvo")} className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition">Cadastrar Alvo</button>
          <button onClick={() => navigate("/consulta-alvos")} className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">Consultar Alvos</button>
        </div>
      </div>
    </div>
  );
}
