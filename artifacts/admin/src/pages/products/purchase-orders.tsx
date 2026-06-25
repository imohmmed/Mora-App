import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";
import { PageContainer, PageHeader, SectionCard, EmptyState } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

export default function PurchaseOrders() {
  const { t } = useT();
  return (
    <PageContainer>
      <PageHeader
        title={t("products.po.title")}
        subtitle={t("products.po.subtitle")}
        actions={
          <Button>
            <Plus className="w-4 h-4 me-2" />
            {t("products.po.create")}
          </Button>
        }
      />

      <SectionCard className="border-dashed" bodyClassName="p-0">
        <EmptyState
          icon={ClipboardList}
          title={t("products.po.emptyTitle")}
          description={t("products.po.emptyDesc")}
          action={
            <Button>
              <Plus className="w-4 h-4 me-2" />
              {t("products.po.create")}
            </Button>
          }
        />
      </SectionCard>
    </PageContainer>
  );
}
