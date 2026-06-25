import { useAdminListCustomerCompanies } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

export default function Companies() {
  const { t } = useT();
  const { data: response, isLoading } = useAdminListCustomerCompanies();
  const companies = response?.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title={t("customers.companies.title")}
        subtitle={t("customers.companies.subtitle")}
        actions={
          <Button data-testid="btn-add-company" className="gap-2">
            <Plus className="w-4 h-4" />
            {t("customers.companies.add")}
          </Button>
        }
      />

      {/* Desktop table */}
      <div className="hidden md:block border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("customers.companies.colName")}</TableHead>
                <TableHead className="text-end">{t("customers.companies.colCustomers")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">{t("common.loading")}</TableCell>
                </TableRow>
              ) : companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Building2 className="h-8 w-8 mb-2 opacity-50" />
                      <p>{t("customers.companies.empty")}</p>
                      <p className="text-xs mt-1">{t("customers.companies.emptyHint")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((c, i) => (
                  <TableRow key={i} className="cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{c.company}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{c.customerCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">{t("common.loading")}</p>
        ) : companies.length === 0 ? (
          <EmptyState icon={Building2} title={t("customers.companies.emptyMobile")} />
        ) : companies.map((c, i) => (
          <Card key={i}>
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">{c.company}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t("customers.customerCount", { n: c.customerCount })}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
