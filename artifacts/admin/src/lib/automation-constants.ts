// Mirror of Chatwoot's automation builder configuration (events → conditions /
// actions, operators per attribute). Keeps the admin rule builder in parity
// with the Chatwoot dashboard.

export type OperatorValue =
  | "equal_to"
  | "not_equal_to"
  | "contains"
  | "does_not_contain"
  | "is_present"
  | "is_not_present"
  | "starts_with"
  | "is_greater_than"
  | "is_less_than";

export type InputType =
  | "plain_text"
  | "comma_separated"
  | "enum"
  | "multi_enum"
  | "agent"
  | "team"
  | "inbox"
  | "label";

export type ConditionConfig = {
  key: string;
  inputType: InputType;
  operators: OperatorValue[];
  enumValues?: string[];
};

export type ActionConfig = {
  key: string;
  inputType: "none" | "agent" | "team" | "label" | "message" | "email" | "url";
};

const OP1: OperatorValue[] = ["equal_to", "not_equal_to"];
const OP2: OperatorValue[] = ["equal_to", "not_equal_to", "contains", "does_not_contain"];
const OP3: OperatorValue[] = ["equal_to", "not_equal_to", "is_present", "is_not_present"];
const OP6: OperatorValue[] = ["equal_to", "not_equal_to", "contains", "does_not_contain", "starts_with"];

// Reusable condition definitions keyed by attribute.
const C = {
  status: { key: "status", inputType: "multi_enum", operators: OP1, enumValues: ["open", "resolved", "pending", "snoozed"] },
  message_type: { key: "message_type", inputType: "enum", operators: OP1, enumValues: ["incoming", "outgoing"] },
  private_note: { key: "private_note", inputType: "enum", operators: OP1, enumValues: ["true", "false"] },
  content: { key: "content", inputType: "comma_separated", operators: OP2 },
  email: { key: "email", inputType: "plain_text", operators: OP2 },
  inbox_id: { key: "inbox_id", inputType: "inbox", operators: OP1 },
  assignee_id: { key: "assignee_id", inputType: "agent", operators: OP3 },
  team_id: { key: "team_id", inputType: "team", operators: OP3 },
  priority: { key: "priority", inputType: "multi_enum", operators: OP1, enumValues: ["nil", "low", "medium", "high", "urgent"] },
  conversation_language: { key: "conversation_language", inputType: "plain_text", operators: OP1 },
  browser_language: { key: "browser_language", inputType: "plain_text", operators: OP1 },
  phone_number: { key: "phone_number", inputType: "plain_text", operators: OP6 },
  company_name: { key: "company_name", inputType: "plain_text", operators: OP2 },
  labels: { key: "labels", inputType: "label", operators: OP3 },
  country_code: { key: "country_code", inputType: "plain_text", operators: OP1 },
  mail_subject: { key: "mail_subject", inputType: "plain_text", operators: OP2 },
  referer: { key: "referer", inputType: "plain_text", operators: OP2 },
} satisfies Record<string, ConditionConfig>;

// Reusable action definitions keyed by action name.
const A = {
  assign_agent: { key: "assign_agent", inputType: "agent" },
  assign_team: { key: "assign_team", inputType: "team" },
  remove_assigned_agent: { key: "remove_assigned_agent", inputType: "none" },
  remove_assigned_team: { key: "remove_assigned_team", inputType: "none" },
  add_label: { key: "add_label", inputType: "label" },
  remove_label: { key: "remove_label", inputType: "label" },
  send_message: { key: "send_message", inputType: "message" },
  send_email_transcript: { key: "send_email_transcript", inputType: "email" },
  mute_conversation: { key: "mute_conversation", inputType: "none" },
  snooze_conversation: { key: "snooze_conversation", inputType: "none" },
  resolve_conversation: { key: "resolve_conversation", inputType: "none" },
  open_conversation: { key: "open_conversation", inputType: "none" },
  pending_conversation: { key: "pending_conversation", inputType: "none" },
  send_webhook_event: { key: "send_webhook_event", inputType: "url" },
} satisfies Record<string, ActionConfig>;

export type EventConfig = {
  conditions: ConditionConfig[];
  actions: ActionConfig[];
};

export const EVENTS = [
  "conversation_created",
  "conversation_updated",
  "conversation_opened",
  "conversation_resolved",
  "message_created",
] as const;

export type EventKey = (typeof EVENTS)[number];

const BASE_ACTIONS: ActionConfig[] = [
  A.assign_agent, A.assign_team, A.remove_assigned_agent, A.remove_assigned_team,
  A.send_message, A.send_email_transcript, A.mute_conversation, A.snooze_conversation,
  A.resolve_conversation, A.open_conversation, A.pending_conversation, A.send_webhook_event,
];

export const AUTOMATIONS: Record<EventKey, EventConfig> = {
  message_created: {
    conditions: [
      C.message_type, C.private_note, C.content, C.email, C.inbox_id, C.status,
      C.assignee_id, C.team_id, C.priority, C.conversation_language, C.phone_number,
      C.company_name, C.labels,
    ],
    actions: [A.add_label, A.remove_label, ...BASE_ACTIONS],
  },
  conversation_created: {
    conditions: [
      C.status, C.browser_language, C.mail_subject, C.country_code, C.phone_number,
      C.company_name, C.referer, C.email, C.inbox_id, C.conversation_language,
      C.priority, C.labels,
    ],
    actions: [A.add_label, A.remove_label, ...BASE_ACTIONS],
  },
  conversation_updated: {
    conditions: [
      C.status, C.browser_language, C.mail_subject, C.country_code, C.referer,
      C.phone_number, C.company_name, C.assignee_id, C.team_id, C.email, C.inbox_id,
      C.conversation_language, C.priority, C.labels,
    ],
    actions: [A.add_label, A.remove_label, ...BASE_ACTIONS],
  },
  conversation_opened: {
    conditions: [
      C.browser_language, C.email, C.mail_subject, C.country_code, C.referer,
      C.assignee_id, C.phone_number, C.company_name, C.team_id, C.inbox_id,
      C.conversation_language, C.priority, C.labels,
    ],
    actions: [A.add_label, A.remove_label, ...BASE_ACTIONS],
  },
  conversation_resolved: {
    conditions: [
      C.browser_language, C.email, C.mail_subject, C.country_code, C.referer,
      C.assignee_id, C.phone_number, C.company_name, C.team_id, C.inbox_id,
      C.conversation_language, C.priority,
    ],
    actions: [
      A.assign_agent, A.assign_team, A.remove_assigned_agent, A.remove_assigned_team,
      A.send_message, A.send_email_transcript, A.send_webhook_event,
    ],
  },
};

// Operators that don't require a value.
export const VALUELESS_OPERATORS: OperatorValue[] = ["is_present", "is_not_present"];
