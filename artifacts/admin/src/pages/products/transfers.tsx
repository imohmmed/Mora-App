import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight } from "lucide-react";
import { PageContainer, PageHeader, SectionCard, EmptyState } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

export default function Transfers() {
  const { t } = useT();
  return (
    <PageContainer>
      <PageHeader
        title={t("products.transfers.title")}
        subtitle={t("products.transfers.subtitle")}
        actions={
          <Button>
            <Plus className="w-4 h-4 me-2" />
            {t("products.transfers.new")}
          </Button>
        }
      />

      <SectionCard className="border-dashed" bodyClassName="p-0">
        <EmptyState
          icon={ArrowLeftRight}
          title={t("products.transfers.emptyTitle")}
          description={t("products.transfers.emptyDesc")}
          action={
            <Button>
              <Plus className="w-4 h-4 me-2" />
              {t("products.transfers.create")}
            </Button>
          }
        />
      </SectionCard>
    </PageContainer>
  );
}
