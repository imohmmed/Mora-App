import { Button } from "@/components/ui/button";
import { Plus, Gift } from "lucide-react";
import { PageContainer, PageHeader, SectionCard, EmptyState } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

export default function GiftCards() {
  const { t } = useT();
  return (
    <PageContainer>
      <PageHeader
        title={t("products.giftCards.title")}
        subtitle={t("products.giftCards.subtitle")}
        actions={
          <Button>
            <Plus className="w-4 h-4 me-2" />
            {t("products.giftCards.issue")}
          </Button>
        }
      />

      <SectionCard className="border-dashed" bodyClassName="p-0">
        <EmptyState
          icon={Gift}
          title={t("products.giftCards.emptyTitle")}
          description={t("products.giftCards.emptyDesc")}
          action={
            <Button>
              <Plus className="w-4 h-4 me-2" />
              {t("products.giftCards.issue")}
            </Button>
          }
        />
      </SectionCard>
    </PageContainer>
  );
}
