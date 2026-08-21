import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { api, type Message } from "../lib/api";
import { PLATFORM_META } from "../lib/platforms";

const PLATFORMS = ["shopee", "tiktok", "instagram"] as const;
export type Platform = (typeof PLATFORMS)[number];

const PLATFORM_LABELS: Record<Platform, string> = {
  shopee: "Shopee",
  tiktok: "TikTok Shop",
  instagram: "Instagram",
};

interface Conversation {
  threadId: string;
  customerName: string;
  messages: Message[];
  lastMessageAt: number;
}

function buildConversations(messages: Message[], platform: Platform): Conversation[] {
  const threads = new Map<string, Message[]>();
  for (const message of messages) {
    if (message.platform !== platform) continue;
    const list = threads.get(message.thread_id) ?? [];
    list.push(message);
    threads.set(message.thread_id, list);
  }

  const conversations: Conversation[] = [];
  for (const [threadId, list] of threads) {
    list.sort((a, b) => a.id - b.id);
    const customerName = list.find((m) => m.customer_name)?.customer_name ?? threadId;
    const lastMessageAt = Math.max(...list.map((m) => new Date(m.created_at).getTime()));
    conversations.push({ threadId, customerName, messages: list, lastMessageAt });
  }

  conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  return conversations;
}

interface InboxProps {
  autoReplyEnabled: boolean;
  onToggleAutoReply: (enabled: boolean) => void;
  initialPlatform?: Platform | null;
  onConsumedInitialPlatform?: () => void;
}

export default function Inbox({
  autoReplyEnabled,
  onToggleAutoReply,
  initialPlatform,
  onConsumedInitialPlatform,
}: InboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [activePlatform, setActivePlatform] = useState<Platform>(initialPlatform ?? "shopee");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState("");
  const [sendingManual, setSendingManual] = useState(false);
  const autoSending = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (initialPlatform) onConsumedInitialPlatform?.();
  }, []);

  const load = () => api.listMessages().then(setMessages).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const conversations = useMemo(
    () => buildConversations(messages, activePlatform),
    [messages, activePlatform]
  );

  // Keep the selected chatroom valid: if it no longer belongs to the active
  // platform's conversation list (tab switch, or the thread disappeared),
  // fall back to the most recently active conversation.
  useEffect(() => {
    if (conversations.some((c) => c.threadId === selectedThreadId)) return;
    setSelectedThreadId(conversations[0]?.threadId ?? null);
  }, [conversations, selectedThreadId]);

  const selectedConversation = conversations.find((c) => c.threadId === selectedThreadId) ?? null;

  useEffect(() => {
    setManualInput("");
  }, [selectedThreadId]);

  // Controlled automation: only auto_safe drafts (deterministic lookups, no
  // judgment call) get auto-sent, and only while the toggle is on. Anything
  // else always waits for manual approval.
  useEffect(() => {
    if (!autoReplyEnabled) return;

    const autoSafeDrafts = messages.filter(
      (m) => m.sender === "ai_draft" && m.status === "draft" && m.risk === "auto_safe" && !autoSending.current.has(m.id)
    );
    if (autoSafeDrafts.length === 0) return;

    for (const draft of autoSafeDrafts) {
      autoSending.current.add(draft.id);
      api
        .updateMessage(draft.id, { status: "sent" })
        .then(load)
        .finally(() => autoSending.current.delete(draft.id));
    }
  }, [messages, autoReplyEnabled]);

  const handleGenerateReply = async (sourceMessageId: number) => {
    setBusy(sourceMessageId);
    try {
      await api.draftReply(sourceMessageId);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleSetStatus = async (message: Message, status: "approved" | "sent") => {
    setBusy(message.id);
    try {
      await api.updateMessage(message.id, { body: drafts[message.id] ?? message.body, status });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleSendManual = async () => {
    if (!selectedConversation || !manualInput.trim()) return;
    setSendingManual(true);
    try {
      await api.sendMessage({
        platform: activePlatform,
        thread_id: selectedConversation.threadId,
        customer_name: selectedConversation.customerName,
        body: manualInput.trim(),
      });
      setManualInput("");
      await load();
    } finally {
      setSendingManual(false);
    }
  };

  return (
    <section>
      <div className="page-header">
        <h1>Unified Inbox</h1>
        <p>Customer chats across Shopee, TikTok Shop, and Instagram — AI drafts a reply, you approve before it sends.</p>
      </div>

      <div className="card">
        <label className="toggle-row">
          <span className="switch">
            <input
              type="checkbox"
              checked={autoReplyEnabled}
              onChange={(e) => onToggleAutoReply(e.target.checked)}
            />
            <span className="switch-track" />
          </span>
          <span>
            Automate safe replies
            <span className="toggle-hint">
              Drafts tagged <code>auto_safe</code> send automatically. Anything tagged <code>needs_review</code> always waits for your approval.
            </span>
          </span>
        </label>

        <div className="platform-tabs">
          {PLATFORMS.map((platform) => {
            const meta = PLATFORM_META[platform];
            const style = { "--tab-color": meta.solidColor } as CSSProperties;
            return (
              <button
                key={platform}
                type="button"
                className={`platform-tab ${activePlatform === platform ? "active" : ""}`}
                style={style}
                onClick={() => setActivePlatform(platform)}
              >
                <meta.Icon size={16} />
                {PLATFORM_LABELS[platform]}
              </button>
            );
          })}
        </div>

        <div className="chat-layout">
          <div className="chat-list">
            {conversations.length === 0 ? (
              <div className="chat-empty">No conversations yet for {PLATFORM_LABELS[activePlatform]}.</div>
            ) : (
              conversations.map((conversation) => {
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                return (
                  <button
                    key={conversation.threadId}
                    type="button"
                    className={`chat-list-item ${conversation.threadId === selectedThreadId ? "active" : ""}`}
                    onClick={() => setSelectedThreadId(conversation.threadId)}
                  >
                    <div className="chat-list-name">{conversation.customerName}</div>
                    <div className="chat-list-preview">{lastMessage?.body}</div>
                    <div className="chat-list-time">
                      {new Date(conversation.lastMessageAt).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="chat-detail">
            {!selectedConversation ? (
              <div className="chat-empty">Select a conversation to view messages.</div>
            ) : (
              <>
                <div className="chat-detail-header">{selectedConversation.customerName}</div>
                <div className="chat-detail-messages">
                  {selectedConversation.messages.map((message) => {
                    const isDraft = message.sender === "ai_draft" && message.status === "draft";
                    const bubbleClass = [
                      message.sender === "customer" ? "chat-bubble-customer" : "chat-bubble-draft",
                      isDraft && "chat-bubble-editing",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div key={message.id} className={`chat-bubble ${bubbleClass}`}>
                        <div className="row-meta">
                          <strong>{message.sender}</strong>
                          {message.risk && <span className="pill pill-accent">{message.risk}</span>}
                        </div>
                        {isDraft ? (
                          <textarea
                            className="field"
                            value={drafts[message.id] ?? message.body}
                            onChange={(e) => setDrafts((d) => ({ ...d, [message.id]: e.target.value }))}
                          />
                        ) : (
                          <p style={{ color: "var(--text)" }}>{message.body}</p>
                        )}
                        <div className="row-meta">status: {message.status}</div>

                        {isDraft && (
                          <div className="btn-row">
                            <button type="button" className="btn" disabled={busy === message.id} onClick={() => handleSetStatus(message, "approved")}>
                              Approve
                            </button>
                            <button type="button" className="btn btn-primary" disabled={busy === message.id} onClick={() => handleSetStatus(message, "sent")}>
                              Approve &amp; Send
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(() => {
                    const lastCustomerMessage = [...selectedConversation.messages].reverse().find((m) => m.sender === "customer");
                    const pendingDraft = selectedConversation.messages.find((m) => m.sender === "ai_draft" && m.status === "draft");
                    if (!lastCustomerMessage || pendingDraft) return null;
                    return (
                      <button
                        type="button"
                        className="btn"
                        disabled={busy === lastCustomerMessage.id}
                        onClick={() => handleGenerateReply(lastCustomerMessage.id)}
                      >
                        {busy === lastCustomerMessage.id ? "Drafting…" : "Generate AI reply"}
                      </button>
                    );
                  })()}
                </div>

                <div className="chat-compose">
                  <input
                    className="field"
                    style={{ minHeight: "unset" }}
                    placeholder="Type a message to the customer…"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !sendingManual) handleSendManual();
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={sendingManual || !manualInput.trim()}
                    onClick={handleSendManual}
                  >
                    {sendingManual ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
