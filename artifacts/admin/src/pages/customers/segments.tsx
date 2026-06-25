import { useAdminListCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Users, TrendingUp, ShoppingBag, Star } from "lucide-react";
import { formatIQD } from "@/lib/format";
import { PageContainer, PageHeader } from "@/components/ui/page-primitives";
import { useT } from "@/i18n/LanguageContext";

type Segment = {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
  filter: (c: { totalSpent?: number | null; ordersCount?: number | null }) => boolean;
};

const SEGMENTS: Segment[] = [
  {
    id: "vip",
    nameKey: "customers.segments.vip.name",
    descKey: "customers.segments.vip.desc",
    icon: <Star className="w-5 h-5" />,
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    filter: (c) => (c.totalSpent ?? 0) > 500,
  },
  {
    id: "loyal",
    nameKey: "customers.segments.loyal.name",
    descKey: "customers.segments.loyal.desc",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-800",
    filter: (c) => (c.ordersCount ?? 0) >= 3,
  },
  {
    id: "active",
    nameKey: "customers.segments.active.name",
    descKey: "customers.segments.active.desc",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "bg-green-50 border-green-200 text-green-800",
    filter: (c) => (c.ordersCount ?? 0) >= 1,
  },
  {
    id: "new",
    nameKey: "customers.segments.new.name",
    descKey: "customers.segments.new.desc",
    icon: <Users className="w-5 h-5" />,
    color: "bg-purple-50 border-purple-200 text-purple-800",
    filter: (c) => (c.ordersCount ?? 0) === 1,
  },
];

export default function CustomerSegments() {
  const { t } = useT();
  const { data: response, isLoading } = useAdminListCustomers({});
  const allCustomers = response?.data ?? [];

  return (
    <PageContainer>
      <PageHeader
        title={t("customers.segments.title")}
        subtitle={t("customers.segments.subtitle")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SEGMENTS.map((seg) => {
          const count = isLoading ? null : allCustomers.filter(seg.filter).length;
          return (
            <a key={seg.id} href={`#${seg.id}`} className="block">
              <Card className={`border-2 transition-shadow hover:shadow-md cursor-pointer`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${seg.color}`}>{seg.icon}</div>
                    {count !== null && (
                      <Badge variant="secondary" className="text-base font-bold px-3 py-1 tabular-nums">
                        {count}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3">{t(seg.nameKey)}</CardTitle>
                  <CardDescription className="text-xs">{t(seg.descKey)}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          );
        })}
      </div>

      <div className="space-y-10">
        {SEGMENTS.map((seg) => {
          const segCustomers = isLoading ? [] : allCustomers.filter(seg.filter);
          return (
            <div key={seg.id} id={seg.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-1.5 rounded-md ${seg.color}`}>{seg.icon}</div>
                <div>
                  <h2 className="text-lg font-semibold">{t(seg.nameKey)}</h2>
                  <p className="text-sm text-muted-foreground">{t(seg.descKey)}</p>
                </div>
                <Badge variant="outline" className="ms-auto">{t("customers.customerCount", { n: segCustomers.length })}</Badge>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead>{t("common.email")}</TableHead>
                        <TableHead className="text-end">{t("customers.col.orders")}</TableHead>
                        <TableHead className="text-end">{t("customers.col.spent")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                            {t("common.loading")}
                          </TableCell>
                        </TableRow>
                      ) : segCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                            {t("customers.segments.empty")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        segCustomers.map((c) => (
                          <TableRow key={c.id} className="relative cursor-pointer">
                            <TableCell className="font-medium">
                              <Link href={`/customers/${c.id}`} className="absolute inset-0">
                                <span className="sr-only">{t("customers.viewCustomer", { name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() })}</span>
                              </Link>
                              {c.firstName} {c.lastName}
                            </TableCell>
                            <TableCell>{c.email}</TableCell>
                            <TableCell className="text-end tabular-nums">{c.ordersCount ?? 0}</TableCell>
                            <TableCell className="text-end font-medium tabular-nums">
                              {formatIQD(c.totalSpent ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
}
