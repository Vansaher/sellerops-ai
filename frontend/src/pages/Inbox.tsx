import { useEffect, useMemo, useRef, useState } from "react";
import { api, type Message } from "../lib/api";

function groupByThread(messages: Message[]): Map<string, Message[]> {
  const threads = new Map<string, Message[]>();
  for (const message of messages) {
    const list = threads.get(message.thread_id) ?? [];
    list.push(message);
    threads.set(message.thread_id, list);
  }
  for (const list of threads.values()) {
    list.sort((a, b) => a.id - b.id);
  }
  return threads;
}

interface InboxProps {
  autoReplyEnabled: boolean;
  onToggleAutoReply: (enabled: boolean) => void;
}

export default function Inbox({ autoReplyEnabled, onToggleAutoReply }: InboxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const autoSending = useRef<Set<number>>(new Set());

  const load = () => api.listMessages().then(setMessages).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const threads = useMemo(() => groupByThread(messages), [messages]);

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

  return (
    <section>
      <div className="page-header">
        <h1>Unified Inbox</h1>
        <p>Customer chats across Shopee, TikTok Shop, and Instagram — AI drafts a reply, you approve before it sends.</p>
      </div>

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

      <div className="row-list">
        {[...threads.entries()].map(([threadId, thread]) => {
          const lastCustomerMessage = [...thread].reverse().find((m) => m.sender === "customer");
          const pendingDraft = thread.find((m) => m.sender === "ai_draft" && m.status === "draft");

          return (
            <div key={threadId} className="row-item">
              <div className="row-meta">
                {threadId} · {thread[0]?.platform}
              </div>

              {thread.map((message) => (
                <div key={message.id} className="row-entry">
                  <div>
                    <strong>{message.sender}</strong>
                    {message.risk && <span className="pill pill-accent">{message.risk}</span>}
                  </div>
                  {message.status === "draft" && message.sender === "ai_draft" ? (
                    <textarea
                      className="field"
                      value={drafts[message.id] ?? message.body}
                      onChange={(e) => setDrafts((d) => ({ ...d, [message.id]: e.target.value }))}
                    />
                  ) : (
                    <p style={{ color: "var(--text)" }}>{message.body}</p>
                  )}
                  <div className="row-meta">status: {message.status}</div>

                  {message.sender === "ai_draft" && message.status === "draft" && (
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
              ))}

              {lastCustomerMessage && !pendingDraft && (
                <button
                  type="button"
                  className="btn"
                  disabled={busy === lastCustomerMessage.id}
                  onClick={() => handleGenerateReply(lastCustomerMessage.id)}
                >
                  {busy === lastCustomerMessage.id ? "Drafting…" : "Generate AI reply"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
