import { useState, FormEvent, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, Globe2, Lock, Mail, Send, UserPlus } from "lucide-react";
import { LanguageToggle } from "../../components/ui/LanguageToggle";
import { useLanguage } from "../../context/LanguageContext";
import { Modal } from "../../components/ui/Modal";
import { AreaSelect } from "../../components/ui/AreaSelect";
import { DEFAULT_INSTITUTIONAL_AREA, InstitutionalArea } from "../../constants/institutionalAreas";

interface TechnicianRequestForm {
  name: string;
  email: string;
  area: InstitutionalArea;
  phone: string;
  message: string;
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestForm, setRequestForm] = useState<TechnicianRequestForm>({
    name: "",
    email: "",
    area: DEFAULT_INSTITUTIONAL_AREA,
    phone: "",
    message: "",
  });

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const openAccessForm = () => {
    setIsAccessModalOpen(true);
    setRequestSent(false);
    setRequestForm((current) => ({
      ...current,
      email: email || current.email,
      message: "",
    }));
  };

  const closeRequestForm = () => {
    setIsAccessModalOpen(false);
    setRequestSent(false);
    setIsSendingRequest(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email, password }, rememberMe);
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || t("loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTechnicianRequest = (e: FormEvent) => {
    e.preventDefault();
    setIsSendingRequest(true);

    const storedRequests = JSON.parse(
      localStorage.getItem("adminAccessRequests") || "[]"
    );
    const nextRequest = {
      ...requestForm,
      type: "access",
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "adminAccessRequests",
      JSON.stringify([nextRequest, ...storedRequests])
    );
    setIsSendingRequest(false);
    setRequestSent(true);
    setRequestForm({ name: "", email: "", area: DEFAULT_INSTITUTIONAL_AREA, phone: "", message: "" });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#043b63] via-[#006b4f] to-[#009739] p-4">
      {/* Fondo con cruces */}
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,_transparent_20%,_transparent_20%),linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] bg-[length:28px_28px]" />

      <div className="relative w-full max-w-md">
        <div className="rounded-[28px] bg-gray-50/95 shadow-2xl px-8 py-8">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-gray-200 bg-white/80 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">
              {t("selectLanguage")}
            </span>
            <LanguageToggle />
          </div>

          {/* Logo */}
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#009739] to-[#002776] shadow-lg">
              <Globe2 className="h-9 w-9 text-white" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-800">
              {t("embassy")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">{t("consularSystem")}</p>
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
                {t("emailOrCpf")}
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  required
                  className="w-full rounded-2xl border border-gray-200 bg-white px-12 py-3.5 text-gray-700 outline-none transition focus:border-[#009739] focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t("password")}
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
                {t("rememberMe")}
              </label>
            </div>

            {/* Botón login */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-[#009739] to-[#00852f] py-3.5 font-semibold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? t("loggingIn") : t("login")}
            </button>
          </form>

          {/* Usuarios actuales */}
          <div className="mt-6 rounded-xl border border-gray-200 bg-white/70 p-4 text-xs text-gray-500 space-y-1">
            <p>
              <strong>Admin:</strong> admin@sistema.com / admin123
            </p>
            <p>
              <strong>{t("technician")}:</strong> tecnico@sistema.com /
              tecnico123
            </p>
            <p>
              <strong>{t("user")}:</strong> usuario@sistema.com / usuario123
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-gray-500">
            {t("noAccount")}{" "}
            <button
              type="button"
              onClick={openAccessForm}
              className="font-medium text-[#009739] hover:underline"
            >
              {t("requestAccess")}
            </button>
          </p>
        </div>
      </div>

      <Modal
        isOpen={isAccessModalOpen}
        onClose={closeRequestForm}
        title={t("accessRequestTitle")}
        size="md"
      >
        {requestSent ? (
          <div className="space-y-4 py-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#009739]">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary-900">
                {t("adminAccessRequestSent")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("adminAccessRequestNote")}
              </p>
            </div>
            <button
              type="button"
              onClick={closeRequestForm}
              className="btn-primary w-full"
            >
              {t("close")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleTechnicianRequest} className="space-y-5">
            <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-primary-800">
              {t("accessRequestIntro")}
            </p>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("fullName")}
                </label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
                  <input
                    type="text"
                    value={requestForm.name}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, name: e.target.value })
                    }
                    className="input border-slate-300 pl-10"
                    required
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("emailOrCpf")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
                  <input
                    type="email"
                    value={requestForm.email}
                    onChange={(e) =>
                      setRequestForm({ ...requestForm, email: e.target.value })
                    }
                    className="input border-slate-300 pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("workArea")}
                </label>
                <AreaSelect
                  value={requestForm.area}
                  onChange={(area) => setRequestForm({ ...requestForm, area: area as InstitutionalArea })}
                  className="input border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("phone")}
                </label>
                <input
                  type="tel"
                  value={requestForm.phone}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, phone: e.target.value })
                  }
                  className="input border-slate-300"
                />
              </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("message")}
                </label>
                <textarea
                  value={requestForm.message}
                  onChange={(e) =>
                    setRequestForm({ ...requestForm, message: e.target.value })
                  }
                  className="input min-h-[110px] resize-none border-slate-300"
                  placeholder={t("accessReason")}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRequestForm}
                className="btn-secondary sm:min-w-28"
              >
                {t("cancel")}
              </button>
              <button
                type="submit"
                disabled={isSendingRequest}
                className="btn-primary gap-2 sm:min-w-44"
              >
                <Send className="h-4 w-4" />
                {isSendingRequest ? t("sendingRequest") : t("sendToAdmin")}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
