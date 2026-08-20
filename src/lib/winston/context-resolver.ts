import { WINSTON_CHAT_CREATION_PROMPT } from "@/lib/winston/proposal-prompt";
import {
  getScopeKeyTitle,
  isWinstonPageScopeKey,
  parseWinstonRecordScope,
  recordScopeKey,
  type WinstonPageSection,
  type WinstonRecordScopeEntity,
} from "@/lib/winston/scope";

export type WinstonTrigger =
  | { tier: "global" }
  | { tier: "section"; section: WinstonPageSection }
  | {
      tier: "record";
      entity: "note";
      noteId: string;
      noteTitle?: string;
      onInsertText?: (text: string) => void;
    }
  | {
      tier: "record";
      entity: WinstonRecordScopeEntity;
      recordId: string;
      recordLabel?: string;
    };

export type ResolvedWinstonContext = {
  tier: WinstonTrigger["tier"];
  scopeKey: string | null;
  noteId: string | null;
  title: string;
  subtitle: string;
  placeholder: string;
  empty: string;
  showQuickAdd: boolean;
  systemPrompt: string;
};

const SECTION_PROMPTS: Record<WinstonPageSection, string> = {
  notes:
    "The user is working in Notes — capturing thoughts, not a specific note. Help them develop ideas. You may propose projects, tasks, calendar items, content, or ideas when the conversation warrants it.",
  leads:
    "The user is working in Leads. Help with pipeline thinking, follow-ups, and next actions. You may propose tasks, calendar events, or other items when the conversation warrants it — do not hard-limit to leads.",
  properties:
    "The user is working in Properties. Help with portfolio, tenancy, and maintenance thinking. Propose whatever structured items the conversation actually supports.",
  projects:
    "The user is working in Projects. Help clarify client work, next actions, and deadlines. When they want a project and tasks, list the project and each task as separate items so Create this can attach tasks with projectRef.",
  tasks:
    "The user is working in Tasks. Help break work down and get it scheduled. Propose tasks, projects, or calendar events when the conversation warrants it. Tasks that belong to a new project must be sibling items with projectRef.",
  goals:
    "The user is working in Goals. Help them clarify outcomes and the work that would move them. You may propose projects, tasks, calendar events, or ideas when that's what they described.",
  ideas:
    "The user is working in Ideas. Help them develop and park thinking. Prefer idea proposals when there's no date; use calendar or content when they clearly want those.",
  calendar:
    "The user is working in Calendar. Help them clarify what belongs on the calendar and whether a date is known. Do not invent a date. If a date is clear, a calendar_event is natural; if not, an idea is fine. Other types are allowed if they ask.",
  "content-calendar":
    "The user is working in Content. Help them shape posts — title, platforms, and whether there's a date. Prefer content_post when they want calendar entries, including several from one instruction. Do not invent a date they didn't give or imply (named weekdays count). Other types are allowed if they ask.",
  research:
    "The user is in Research. Answer market, competitor, and business questions with cited evidence from live search. Do not invent facts. Do not propose creating projects, tasks, or calendar items here — this surface is research Q&A only.",
};

const GLOBAL_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. The user opened you from the global button — there is no page or record context. Help with whatever they need. Be conversational but concise. You may propose a mix of projects, tasks, calendar events, content posts, and ideas when the conversation supports creating something. You are on the user's side — constructive, direct, warm. Never lecture or over-explain.`;

const NOTE_RECORD_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. The user is brainstorming on a specific note. Help them develop ideas, clarify thinking, and expand on what's written. Be conversational but concise. Ground every response in the note content provided — do not invent unrelated business context from outside this note. If the note is empty or thin, help them get started. You may still propose projects, tasks, or other items when the note supports it. You are on the user's side — constructive, direct, warm. Never lecture or over-explain.`;

const RESEARCH_SYSTEM_PROMPT = `You are Winston answering Research questions. Synthesize cited evidence from search tools. Be concise, direct, and honest about weak evidence. Never invent facts or figures. Do not propose creating projects, tasks, content, or calendar items on this surface.`;

function withCreationCapability(prompt: string): string {
  return `${prompt}\n\n${WINSTON_CHAT_CREATION_PROMPT}`;
}

function sectionSystemPrompt(section: WinstonPageSection): string {
  if (section === "research") {
    return RESEARCH_SYSTEM_PROMPT;
  }
  return withCreationCapability(
    `You are Winston, WISK's AI business assistant. ${SECTION_PROMPTS[section]} Be conversational but concise. You are on the user's side — constructive, direct, warm. Never lecture or over-explain.`
  );
}

function recordSystemPrompt(
  entity: WinstonRecordScopeEntity,
  label?: string
): string {
  const who = label?.trim() ? `"${label.trim()}"` : `this ${entity}`;
  return `You are Winston, WISK's AI business assistant. The user opened you on ${who}. Help with that record. Be conversational but concise. Do not invent facts that aren't in the provided context. You may propose a mix of entity types when the conversation warrants it. You are on the user's side — constructive, direct, warm. Never lecture or over-explain.`;
}

export function resolveWinstonContext(
  trigger: WinstonTrigger
): ResolvedWinstonContext {
  if (trigger.tier === "global") {
    return {
      tier: "global",
      scopeKey: "global",
      noteId: null,
      title: "Winston",
      subtitle: "Add something quickly, or just tell Winston",
      placeholder: "Tell Winston what you need…",
      empty: "No page context — same Winston wherever you open this.",
      showQuickAdd: true,
      systemPrompt: withCreationCapability(GLOBAL_SYSTEM_PROMPT),
    };
  }

  if (trigger.tier === "section") {
    const scopeKey = trigger.section;
    const isResearch = scopeKey === "research";
    return {
      tier: "section",
      scopeKey,
      noteId: null,
      title: isResearch ? "Ask Winston" : "Brainstorm with Winston",
      subtitle: isResearch
        ? "Research"
        : getScopeKeyTitle(scopeKey).replace(" brainstorm", ""),
      placeholder: isResearch
        ? "Ask a market, competitor, or business question…"
        : "What are you thinking about?",
      empty: isResearch
        ? "Ask anything — Winston will search and cite sources."
        : "Talk it through. When something's ready to create, use Create this.",
      showQuickAdd: false,
      systemPrompt: sectionSystemPrompt(trigger.section),
    };
  }

  if (trigger.entity === "note") {
    const label = trigger.noteTitle?.trim();
    return {
      tier: "record",
      scopeKey: null,
      noteId: trigger.noteId,
      title: "Winston",
      subtitle: label || "This note",
      placeholder: "Brainstorm on this note…",
      empty: "Grounded in this note. Insert a reply, or create items when they're ready.",
      showQuickAdd: false,
      systemPrompt: withCreationCapability(NOTE_RECORD_SYSTEM_PROMPT),
    };
  }

  const scopeKey = recordScopeKey(trigger.entity, trigger.recordId);
  const label = trigger.recordLabel?.trim();
  return {
    tier: "record",
    scopeKey,
    noteId: null,
    title: "Winston",
    subtitle: label || getScopeKeyTitle(scopeKey),
    placeholder: "What do you want to do with this?",
    empty: "This thread is only about this record.",
    showQuickAdd: false,
    systemPrompt: withCreationCapability(
      recordSystemPrompt(trigger.entity, label)
    ),
  };
}

const UNSCOPED_CHAT_SYSTEM_PROMPT = `You are Winston, WISK's AI business assistant. The user is asking you questions directly about their business. Use the context provided to give specific, helpful answers. Be conversational but concise — this is a chat, not a report. If you don't have enough information to answer something, say so honestly rather than guessing. You are on the user's side — constructive, direct, warm. Never lecture or over-explain.`;

export function systemPromptForScope(
  scopeKey: string | null,
  hasNote: boolean
): string {
  if (hasNote) return withCreationCapability(NOTE_RECORD_SYSTEM_PROMPT);
  if (!scopeKey) return withCreationCapability(UNSCOPED_CHAT_SYSTEM_PROMPT);
  if (scopeKey === "global") {
    return resolveWinstonContext({ tier: "global" }).systemPrompt;
  }
  if (isWinstonPageScopeKey(scopeKey) && scopeKey !== "global") {
    return resolveWinstonContext({ tier: "section", section: scopeKey })
      .systemPrompt;
  }
  const parsed = parseWinstonRecordScope(scopeKey);
  if (parsed) {
    return resolveWinstonContext({
      tier: "record",
      entity: parsed.entity,
      recordId: parsed.recordId,
    }).systemPrompt;
  }
  return withCreationCapability(UNSCOPED_CHAT_SYSTEM_PROMPT);
}
