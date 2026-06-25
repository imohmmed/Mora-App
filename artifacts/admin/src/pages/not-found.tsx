import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { useT } from "@/i18n/LanguageContext";

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">404</h1>
        <h2 className="text-lg font-semibold mt-1">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("notFound.desc")}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t("notFound.back")}</Link>
        </Button>
      </div>
    </div>
  );
}
