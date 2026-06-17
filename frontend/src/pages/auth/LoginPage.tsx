import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Globe2, Mail, Lock, Eye, Monitor } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#043b63] via-[#006b4f] to-[#009739] p-4">
      {/* Fondo con cruces */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_transparent_20%,_transparent_20%),linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] bg-[length:28px_28px]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] bg-gray-50/95 shadow-2xl px-8 py-8">
          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#009739] to-[#002776] shadow-lg">
              <Globe2 className="h-9 w-9 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-800">
              Embaixada do Brasil
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Sistema de Gestão Consular
            </p>
          </div>

          {/* Líneas bandera */}
          <div className="mt-8 mb-7 grid grid-cols-3 gap-0">
            <div className="h-1 rounded-l-full bg-[#009739]" />
            <div className="h-1 bg-[#FFDF00]" />
            <div className="h-1 rounded-r-full bg-[#002776]" />
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 text-red-600 p-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Email ou CPF
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white px-12 py-3.5 text-gray-700 outline-none transition focus:border-[#009739] focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Senha
              </label>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white px-12 py-3.5 pr-12 text-gray-700 outline-none transition focus:border-[#009739] focus:ring-4 focus:ring-green-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <Eye className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#009739]"
                />
                Lembrar-me
              </label>

              <button
                type="button"
                className="font-medium text-[#009739] hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            {/* Botón login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#009739] to-[#00852f] py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          {/* Separador */}
          <div className="my-7 flex items-center">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="mx-4 bg-gray-50 px-3 text-sm text-gray-500">
              ou
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* Botones extra */}
          <div className="space-y-3">
            <button
              type="button"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Acesso com Gov.br
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#002776] bg-white py-3 font-medium text-[#002776] shadow-sm transition hover:bg-blue-50"
            >
              <Monitor className="h-5 w-5" />
              Certificado Digital
            </button>
          </div>

          {/* Usuarios actuales */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white/70 p-4 text-xs text-gray-500 space-y-1">
            <p>
              <strong>Admin:</strong> admin@sistema.com / admin123
            </p>
            <p>
              <strong>Técnico:</strong> tecnico@sistema.com / tecnico123
            </p>
            <p>
              <strong>Usuario:</strong> usuario@sistema.com / usuario123
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            Não tem uma conta?{" "}
            <button className="font-medium text-[#009739] hover:underline">
              Solicitar acesso
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
