import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetch } from "@/lib/api";
import { useT } from "@/i18n/LanguageContext";
import { PageContainer, PageHeader, EmptyState } from "@/components/ui/page-primitives";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Plus, Pencil, Trash2, Copy, Search, Loader2, X, Bolt, Filter,
} from "lucide-react";
import {
  AUTOMATIONS, EVENTS, VALUELESS_OPERATORS,
  type EventKey, type ConditionConfig, type ActionConfig, type InputType,
} from "@/lib/automation-constants";

type RuleCondition = {
  attribute_key: string;
  filter_operator: string;
  query_operator: "and" | "or" | null;
  values: (string | number)[];
};
type RuleAction = {
  action_name: string;
  action_params: unknown[];
};
type AutomationRule = {
  id: number;
  name: string;
  description: string | null;
  event_name: EventKey;
  active: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
};

type RefItem = { id: number; name?: string; title?: string; available_name?: string };

export default function AutomationPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<AutomationRule | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const res = await adminFetch<{ payload?: AutomationRule[] } | AutomationRule[]>("/admin/chat/automation_rules");
      if (res.error) throw new Error(res.error);
      const d = res.data as { payload?: AutomationRule[] } | AutomationRule[];
      return Array.isArray(d) ? d : d?.payload ?? [];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      const res = await adminFetch(`/admin/chat/automation_rules/${rule.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...serializeRule(rule), active: !rule.active }),
      });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      toast({ title: t("auto.toast.toggled") });
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : t("chat.error.generic"), variant: "destructive" }),
  });

  const cloneMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/admin/chat/automation_rules/${id}/clone`, { method: "POST" });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      toast({ title: t("auto.toast.cloned") });
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : t("chat.error.generic"), variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await adminFetch(`/admin/chat/automation_rules/${id}`, { method: "DELETE" });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      toast({ title: t("auto.toast.deleted") });
      setToDelete(null);
    },
    onError: (e) => toast({ title: e instanceof Error ? e.message : t("chat.error.generic"), variant: "destructive" }),
  });

  const all = data ?? [];
  const items = search.trim()
    ? all.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : all;

  return (
    <PageContainer>
      <PageHeader
        title={t("auto.title")}
        subtitle={t("auto.subtitle")}
        actions={
          <Button onClick={() => setCreating(true)} data-testid="button-new-rule">
            <Plus className="h-4 w-4 me-1.5" />
            {t("auto.new")}
          </Button>
        }
      />

      {error ? (
        <Card>
          <EmptyState icon={Zap} title={t("auto.notConfigured.title")} description={t("auto.notConfigured.desc")} />
        </Card>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("auto.search")}
              className="ps-9"
              data-testid="input-search-rule"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <EmptyState
                icon={Zap}
                title={search ? t("auto.title") : t("auto.empty.title")}
                description={search ? undefined : t("auto.empty.desc")}
                action={
                  !search && (
                    <Button onClick={() => setCreating(true)}>
                      <Plus className="h-4 w-4 me-1.5" />
                      {t("auto.empty.cta")}
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("auto.count", { n: items.length })}</p>
              <div className="space-y-3">
                {items.map((rule) => (
                  <Card
                    key={rule.id}
                    className="group p-4 sm:p-5 flex items-start gap-4 hover-elevate transition-shadow"
                    data-testid={`card-rule-${rule.id}`}
                  >
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        rule.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Bolt className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{rule.name}</h3>
                        <Badge variant={rule.active ? "default" : "secondary"} className="text-[10px]">
                          {rule.active ? t("auto.active") : t("auto.inactive")}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{rule.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5">
                          <Zap className="h-3 w-3" />
                          {t(`auto.event.${rule.event_name}`)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {(rule.conditions?.length ?? 0)} · {(rule.actions?.length ?? 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() => toggleMut.mutate(rule)}
                        data-testid={`switch-rule-${rule.id}`}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => cloneMut.mutate(rule.id)} data-testid={`button-clone-rule-${rule.id}`}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setToDelete(rule)}
                        data-testid={`button-delete-rule-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {(creating || editing) && (
        <RuleForm
          open={creating || !!editing}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("auto.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("auto.delete.desc", { name: toDelete?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && deleteMut.mutate(toDelete.id)}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
              {t("action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

// Strip a rule down to the writable payload shape Chatwoot expects.
function serializeRule(rule: {
  name: string;
  description?: string | null;
  event_name: string;
  active: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}) {
  return {
    name: rule.name,
    description: rule.description ?? "",
    event_name: rule.event_name,
    active: rule.active,
    conditions: rule.conditions,
    actions: rule.actions,
  };
}

// ─── Rule builder dialog ──────────────────────────────────────────────────
function RuleForm({
  open,
  initial,
  onClose,
}: {
  open: boolean;
  initial: AutomationRule | null;
  onClose: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [eventName, setEventName] = useState<EventKey>(initial?.event_name ?? "conversation_created");
  const [active, setActive] = useState(initial?.active ?? true);
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initial?.conditions?.length ? initial.conditions : [blankCondition("conversation_created")]
  );
  const [actions, setActions] = useState<RuleAction[]>(
    initial?.actions?.length ? initial.actions : [blankAction("conversation_created")]
  );
  const [err, setErr] = useState("");

  // Reference data for value pickers.
  const { data: agents } = useQuery({ queryKey: ["chat_agents"], queryFn: () => fetchRef("agents") });
  const { data: teams } = useQuery({ queryKey: ["chat_teams"], queryFn: () => fetchRef("teams") });
  const { data: labels } = useQuery({ queryKey: ["chat_labels"], queryFn: () => fetchRef("labels") });
  const { data: inboxes } = useQuery({ queryKey: ["chat_inboxes"], queryFn: () => fetchRef("inboxes") });

  const cfg = AUTOMATIONS[eventName];

  const changeEvent = (ev: EventKey) => {
    setEventName(ev);
    setConditions([blankCondition(ev)]);
    setActions([blankAction(ev)]);
  };

  const mut = useMutation({
    mutationFn: async (normCond: RuleCondition[]) => {
      const payload = serializeRule({ name: name.trim(), description, event_name: eventName, active, conditions: normCond, actions });
      const path = isEdit ? `/admin/chat/automation_rules/${initial!.id}` : "/admin/chat/automation_rules";
      const res = await adminFetch(path, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(payload) });
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      toast({ title: isEdit ? t("auto.toast.updated") : t("auto.toast.created") });
      onClose();
    },
    onError: (e) => setErr(e instanceof Error ? e.message : t("chat.error.generic")),
  });

  const submit = () => {
    if (!name.trim()) return setErr(t("auto.err.nameRequired"));
    if (conditions.length === 0) return setErr(t("auto.err.conditionsRequired"));
    if (actions.length === 0) return setErr(t("auto.err.actionsRequired"));
    setErr("");
    // Normalise query_operator: all but the last condition join with and/or; last is null.
    const normCond = conditions.map((c, i) => ({
      ...c,
      query_operator: i === conditions.length - 1 ? null : (c.query_operator ?? "and"),
    }));
    setConditions(normCond);
    mut.mutate(normCond);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("auto.form.editTitle") : t("auto.form.newTitle")}</DialogTitle>
          <DialogDescription>{t("auto.subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Basics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rule-name">{t("auto.form.name")}</Label>
              <Input id="rule-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auto.form.namePlaceholder")} data-testid="input-rule-name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rule-desc">{t("auto.form.description")}</Label>
              <Input id="rule-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("auto.form.descriptionPlaceholder")} data-testid="input-rule-desc" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("auto.form.event")}</Label>
              <Select value={eventName} onValueChange={(v) => changeEvent(v as EventKey)}>
                <SelectTrigger data-testid="select-rule-event"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENTS.map((ev) => (
                    <SelectItem key={ev} value={ev}>{t(`auto.event.${ev}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditions */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">{t("auto.form.conditions")}</Label>
                <p className="text-xs text-muted-foreground">{t("auto.form.conditionsHint")}</p>
              </div>
            </div>
            <div className="space-y-2">
              {conditions.map((cond, i) => (
                <ConditionRow
                  key={i}
                  index={i}
                  total={conditions.length}
                  cond={cond}
                  cfg={cfg.conditions}
                  refs={{ agents, teams, labels, inboxes }}
                  onChange={(next) => setConditions((p) => p.map((c, j) => (j === i ? next : c)))}
                  onRemove={() => setConditions((p) => p.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setConditions((p) => [...p, blankCondition(eventName)])} data-testid="button-add-condition">
              <Plus className="h-4 w-4 me-1.5" />
              {t("auto.form.addCondition")}
            </Button>
          </section>

          {/* Actions */}
          <section className="space-y-2">
            <div>
              <Label className="text-sm font-semibold">{t("auto.form.actions")}</Label>
              <p className="text-xs text-muted-foreground">{t("auto.form.actionsHint")}</p>
            </div>
            <div className="space-y-2">
              {actions.map((act, i) => (
                <ActionRow
                  key={i}
                  act={act}
                  cfg={cfg.actions}
                  refs={{ agents, teams, labels, inboxes }}
                  onChange={(next) => setActions((p) => p.map((a, j) => (j === i ? next : a)))}
                  onRemove={() => setActions((p) => p.filter((_, j) => j !== i))}
                />
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setActions((p) => [...p, blankAction(eventName)])} data-testid="button-add-action">
              <Plus className="h-4 w-4 me-1.5" />
              {t("auto.form.addAction")}
            </Button>
          </section>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={active} onCheckedChange={setActive} data-testid="switch-rule-active" />
            <Label className="cursor-pointer">{t("auto.form.active")}</Label>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("action.cancel")}</Button>
          <Button onClick={submit} disabled={mut.isPending} data-testid="button-save-rule">
            {mut.isPending && <Loader2 className="h-4 w-4 me-1.5 animate-spin" />}
            {t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Refs = { agents?: RefItem[]; teams?: RefItem[]; labels?: RefItem[]; inboxes?: RefItem[] };

function ConditionRow({
  index, total, cond, cfg, refs, onChange, onRemove,
}: {
  index: number;
  total: number;
  cond: RuleCondition;
  cfg: ConditionConfig[];
  refs: Refs;
  onChange: (c: RuleCondition) => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  const attrCfg = cfg.find((c) => c.key === cond.attribute_key) ?? cfg[0];
  const needsValue = !VALUELESS_OPERATORS.includes(cond.filter_operator as never);

  const setAttr = (key: string) => {
    const next = cfg.find((c) => c.key === key)!;
    onChange({ ...cond, attribute_key: key, filter_operator: next.operators[0], values: [] });
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          <Select value={cond.attribute_key} onValueChange={setAttr}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={t("auto.form.attribute")} /></SelectTrigger>
            <SelectContent>
              {cfg.map((c) => (
                <SelectItem key={c.key} value={c.key}>{t(`auto.attr.${c.key}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cond.filter_operator} onValueChange={(v) => onChange({ ...cond, filter_operator: v, values: [] })}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={t("auto.form.operator")} /></SelectTrigger>
            <SelectContent>
              {attrCfg.operators.map((op) => (
                <SelectItem key={op} value={op}>{t(`auto.op.${op}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground flex-shrink-0" onClick={onRemove} data-testid={`button-remove-condition-${index}`}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {needsValue && (
        <ValueInput
          inputType={attrCfg.inputType}
          enumValues={attrCfg.enumValues}
          values={cond.values}
          refs={refs}
          onChange={(values) => onChange({ ...cond, values })}
        />
      )}

      {index < total - 1 && (
        <div className="flex items-center gap-2 pt-1">
          <Select value={cond.query_operator ?? "and"} onValueChange={(v) => onChange({ ...cond, query_operator: v as "and" | "or" })}>
            <SelectTrigger className="h-7 w-20 bg-background text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="and">{t("auto.form.and")}</SelectItem>
              <SelectItem value="or">{t("auto.form.or")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function ValueInput({
  inputType, enumValues, values, refs, onChange,
}: {
  inputType: InputType;
  enumValues?: string[];
  values: (string | number)[];
  refs: Refs;
  onChange: (v: (string | number)[]) => void;
}) {
  const { t } = useT();
  const single = values[0] ?? "";

  if (inputType === "plain_text") {
    return (
      <Input
        value={String(single)}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
        placeholder={t("auto.form.valuePlaceholder")}
        className="bg-background"
      />
    );
  }
  if (inputType === "comma_separated") {
    return (
      <Input
        value={values.join(", ")}
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        placeholder={t("auto.form.valuePlaceholder")}
        className="bg-background"
      />
    );
  }
  if (inputType === "enum") {
    return (
      <Select value={String(single)} onValueChange={(v) => onChange([v])}>
        <SelectTrigger className="bg-background"><SelectValue placeholder={t("auto.form.selectValue")} /></SelectTrigger>
        <SelectContent>
          {(enumValues ?? []).map((v) => (
            <SelectItem key={v} value={v}>{t(`auto.val.${v}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (inputType === "multi_enum") {
    return <MultiChips options={(enumValues ?? []).map((v) => ({ value: v, label: t(`auto.val.${v}`) }))} values={values} onChange={onChange} />;
  }

  // Reference-backed pickers.
  const list = refs[refMapKey(inputType)] ?? [];
  const options = list.map((it) => ({
    value: inputType === "label" ? String(it.title ?? it.name) : String(it.id),
    label: it.name ?? it.title ?? it.available_name ?? String(it.id),
  }));
  return <MultiChips options={options} values={values} onChange={onChange} placeholder={t("auto.form.selectValue")} />;
}

function refMapKey(inputType: InputType): keyof Refs {
  if (inputType === "agent") return "agents";
  if (inputType === "team") return "teams";
  if (inputType === "label") return "labels";
  return "inboxes";
}

function MultiChips({
  options, values, onChange, placeholder,
}: {
  options: { value: string; label: string }[];
  values: (string | number)[];
  onChange: (v: (string | number)[]) => void;
  placeholder?: string;
}) {
  const { t } = useT();
  const strVals = values.map(String);
  const add = (v: string) => {
    if (!v || strVals.includes(v)) return;
    // Preserve numeric ids as numbers for ref pickers.
    const isNum = /^\d+$/.test(v);
    onChange([...values, isNum ? Number(v) : v]);
  };
  const remove = (v: string) => onChange(values.filter((x) => String(x) !== v));

  return (
    <div className="space-y-1.5">
      <Select value="" onValueChange={add}>
        <SelectTrigger className="bg-background"><SelectValue placeholder={placeholder ?? t("auto.form.selectValue")} /></SelectTrigger>
        <SelectContent>
          {options.filter((o) => !strVals.includes(o.value)).map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {strVals.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {strVals.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v;
            return (
              <Badge key={v} variant="secondary" className="gap-1 pe-1">
                {label}
                <button onClick={() => remove(v)} className="rounded-full hover:bg-foreground/10 p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ActionRow({
  act, cfg, refs, onChange, onRemove,
}: {
  act: RuleAction;
  cfg: ActionConfig[];
  refs: Refs;
  onChange: (a: RuleAction) => void;
  onRemove: () => void;
}) {
  const { t } = useT();
  const actCfg = cfg.find((c) => c.key === act.action_name) ?? cfg[0];

  const setAction = (key: string) => onChange({ action_name: key, action_params: [] });

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Select value={act.action_name} onValueChange={setAction}>
          <SelectTrigger className="bg-background flex-1"><SelectValue placeholder={t("auto.form.action")} /></SelectTrigger>
          <SelectContent>
            {cfg.map((c) => (
              <SelectItem key={c.key} value={c.key}>{t(`auto.act.${c.key}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground flex-shrink-0" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ActionParams cfg={actCfg} params={act.action_params} refs={refs} onChange={(action_params) => onChange({ ...act, action_params })} />
    </div>
  );
}

function ActionParams({
  cfg, params, refs, onChange,
}: {
  cfg: ActionConfig;
  params: unknown[];
  refs: Refs;
  onChange: (p: unknown[]) => void;
}) {
  const { t } = useT();
  const it = cfg.inputType;
  if (it === "none") return null;

  if (it === "message") {
    return (
      <Textarea
        value={String(params[0] ?? "")}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
        placeholder={t("auto.form.valuePlaceholder")}
        rows={3}
        className="bg-background"
      />
    );
  }
  if (it === "email" || it === "url") {
    return (
      <Input
        value={String(params[0] ?? "")}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
        placeholder={t("auto.form.valuePlaceholder")}
        className="bg-background"
      />
    );
  }

  // agent / team / label pickers (multi)
  const list = refs[it === "agent" ? "agents" : it === "team" ? "teams" : "labels"] ?? [];
  const options = list.map((i) => ({
    value: it === "label" ? String(i.title ?? i.name) : String(i.id),
    label: i.name ?? i.title ?? i.available_name ?? String(i.id),
  }));
  return <MultiChips options={options} values={params as (string | number)[]} onChange={onChange} />;
}

// ─── helpers ──────────────────────────────────────────────────────────────
function blankCondition(event: EventKey): RuleCondition {
  const first = AUTOMATIONS[event].conditions[0];
  return { attribute_key: first.key, filter_operator: first.operators[0], query_operator: null, values: [] };
}
function blankAction(event: EventKey): RuleAction {
  const first = AUTOMATIONS[event].actions[0];
  return { action_name: first.key, action_params: [] };
}

async function fetchRef(kind: "agents" | "teams" | "labels" | "inboxes"): Promise<RefItem[]> {
  const res = await adminFetch<unknown>(`/admin/chat/${kind}`);
  if (res.error) return [];
  const d = res.data as unknown;
  if (Array.isArray(d)) return d as RefItem[];
  // labels/inboxes come wrapped in { payload: [...] }
  const payload = (d as { payload?: unknown })?.payload;
  return Array.isArray(payload) ? (payload as RefItem[]) : [];
}
