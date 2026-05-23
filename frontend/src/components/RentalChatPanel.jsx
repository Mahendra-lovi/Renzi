import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";

function getParticipantLabel(user) {
  if (!user) return "Unknown";
  return user.name || user.email || "Unknown";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString();
}

function RentalChatPanel({
  rentalId,
  itemId,
  title = "Client-Owner Chat",
  hint = "Discuss pickup timing, handover notes, and agreement clarifications here.",
  compact = false
}) {
  const [chat, setChat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const feedRef = useRef(null);

  const hasMessages = useMemo(
    () => Array.isArray(chat?.messages) && chat.messages.length > 0,
    [chat]
  );

  const mode = useMemo(() => {
    if (rentalId) return "rental";
    if (itemId) return "item";
    return null;
  }, [itemId, rentalId]);

  const fetchChat = useCallback(async ({ silent = false } = {}) => {
    if (!mode) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const endpoint = mode === "rental"
        ? `/rentals/${rentalId}/chat`
        : `/items/${itemId}/chat-thread`;
      const res = await api.get(endpoint);
      setChat(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chat");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [itemId, mode, rentalId]);

  useEffect(() => {
    fetchChat();

    const intervalId = window.setInterval(() => {
      fetchChat({ silent: true });
    }, 7000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchChat]);

  useEffect(() => {
    if (!feedRef.current) return;
    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [chat?.messages?.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !mode) return;

    try {
      setSending(true);
      setError("");
      const endpoint = mode === "rental"
        ? `/rentals/${rentalId}/chat`
        : `/items/${itemId}/chat-thread/messages`;
      const res = await api.post(endpoint, { message: text });
      setChat(res.data.chat);
      setDraft("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const onDraftKeyDown = async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleSend();
    }
  };

  return (
    <aside style={compact ? styles.chatCardCompact : styles.chatCard}>
      <div style={styles.chatHeader}>
        <h3 style={compact ? styles.chatTitleCompact : styles.chatTitle}>{title}</h3>
        <button type="button" style={styles.refreshBtn} onClick={() => fetchChat()}>
          Refresh
        </button>
      </div>

      <p style={compact ? styles.chatHintCompact : styles.chatHint}>
        {hint}
      </p>

      {!mode ? <p style={styles.error}>Chat is unavailable for this view.</p> : null}

      {chat?.participants ? (
        <p style={styles.participants}>
          Owner: {getParticipantLabel(chat.participants.owner)} | Renter: {getParticipantLabel(chat.participants.renter)}
        </p>
      ) : null}

      {loading ? <p style={styles.meta}>Loading chat...</p> : null}
      {error ? <p style={styles.error}>{error}</p> : null}

      <div ref={feedRef} style={compact ? styles.feedCompact : styles.feed}>
        {!hasMessages ? <p style={styles.empty}>No messages yet. Start the conversation.</p> : null}

        {hasMessages
          ? chat.messages.map((entry) => (
              <div
                key={entry._id}
                style={{
                  ...styles.messageRow,
                  justifyContent: entry.isMine ? "flex-end" : "flex-start"
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(entry.isMine ? styles.myBubble : styles.otherBubble)
                  }}
                >
                  <p style={styles.senderName}>
                    {entry.isMine ? "You" : getParticipantLabel(entry.sender)}
                  </p>
                  <p style={styles.messageText}>{entry.message}</p>
                  <p style={styles.messageTime}>{formatTime(entry.createdAt)}</p>
                </div>
              </div>
            ))
          : null}
      </div>

      <div style={compact ? styles.composerCompact : styles.composer}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onDraftKeyDown}
          style={compact ? styles.textareaCompact : styles.textarea}
          rows={3}
          maxLength={1000}
          placeholder="Type a message..."
        />
        <div style={styles.composerFooter}>
          <span style={styles.counter}>{draft.length}/1000</span>
          <button
            type="button"
            style={sending || !draft.trim() || !mode ? styles.sendBtnDisabled : styles.sendBtn}
            onClick={handleSend}
            disabled={sending || !draft.trim() || !mode}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  chatCard: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#ffffff",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 500,
  },
  chatCardCompact: {
    border: "1px solid #d1d5db",
    borderRadius: 10,
    background: "#ffffff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    flex: 1,
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  chatTitle: {
    margin: 0,
    fontSize: 16,
    color: "#111827"
  },
  chatTitleCompact: {
    margin: 0,
    fontSize: 15,
    color: "#111827"
  },
  refreshBtn: {
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#fff",
    color: "#374151",
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12
  },
  chatHint: {
    margin: "8px 0 6px",
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.4
  },
  chatHintCompact: {
    margin: "6px 0 6px",
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.35
  },
  participants: {
    margin: "0 0 8px",
    fontSize: 12,
    color: "#374151"
  },
  meta: {
    margin: "6px 0",
    color: "#4b5563",
    fontSize: 13
  },
  error: {
    margin: "6px 0",
    color: "#b91c1c",
    fontSize: 13
  },
  feed: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 8,
    overflowY: "auto",
    background: "#f9fafb"
  },
  feedCompact: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 7,
    overflowY: "auto",
    background: "#f9fafb"
  },
  empty: {
    margin: "8px 0",
    color: "#6b7280",
    fontSize: 13
  },
  messageRow: {
    display: "flex",
    marginBottom: 8
  },
  messageBubble: {
    maxWidth: "90%",
    borderRadius: 8,
    padding: "8px 10px",
    border: "1px solid transparent"
  },
  myBubble: {
    background: "#111827",
    color: "#fff"
  },
  otherBubble: {
    background: "#fff",
    color: "#111827",
    borderColor: "#d1d5db"
  },
  senderName: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    opacity: 0.85
  },
  messageText: {
    margin: "4px 0",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: 13
  },
  messageTime: {
    margin: 0,
    fontSize: 11,
    opacity: 0.8
  },
  composer: {
    marginTop: 8,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 8
  },
  composerCompact: {
    marginTop: 8,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 6
  },
  textarea: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 8,
    fontFamily: "inherit",
    fontSize: 13,
    resize: "vertical"
  },
  textareaCompact: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: 7,
    fontFamily: "inherit",
    fontSize: 13,
    resize: "vertical",
    minHeight: 78,
  },
  composerFooter: {
    marginTop: 6,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  counter: {
    color: "#6b7280",
    fontSize: 11
  },
  sendBtn: {
    border: "none",
    borderRadius: 6,
    background: "#111827",
    color: "#fff",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: 13
  },
  sendBtnDisabled: {
    border: "none",
    borderRadius: 6,
    background: "#9ca3af",
    color: "#fff",
    padding: "7px 12px",
    cursor: "not-allowed",
    fontSize: 13
  }
};

export default RentalChatPanel;
