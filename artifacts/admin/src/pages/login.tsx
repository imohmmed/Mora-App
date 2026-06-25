import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Loader2, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

export default function Login() {
  const { t } = useT();
  const { login } = useAdminAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSuccess = async (credential: string) => {
    setLoading(true);
    setError("");
    try {
      await login(credential);
    } catch (err: unknown) {
      setError((err as Error).message || t("login.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm px-6 py-10 sm:px-8 space-y-8">

        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <span className="text-5xl font-black tracking-tighter text-foreground">MORA</span>
            <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded uppercase tracking-widest self-end mb-1">
              {t("app.admin")}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <p className="text-sm">{t("login.secureAccess")}</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Google login */}
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground tracking-widest">{t("login.signInWith")}</span>
            </div>
          </div>

          <div className="flex justify-center">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("login.verifying")}
              </div>
            ) : (
              <GoogleLogin
                onSuccess={(cred) => {
                  if (cred.credential) handleSuccess(cred.credential);
                }}
                onError={() => setError(t("login.googleError"))}
                shape="rectangular"
                theme="outline"
                text="signin_with"
                size="large"
                width="280"
                logo_alignment="left"
              />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          {t("login.footer1")}<br />
          {t("login.footer2")}
        </p>
      </div>
    </div>
  );
}
