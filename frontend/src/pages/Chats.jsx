import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import RentalChatPanel from "../components/RentalChatPanel";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function getDisplayName(user) {
  const candidate = String(user?.name || "").trim();
  return candidate || "User";
}

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function Chats() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchThreads = async () => {
      try {
        setLoading(true);
        setMessage("");
        const res = await api.get("/chats");
        if (!mounted) return;
        const nextThreads = Array.isArray(res.data?.threads) ? res.data.threads : [];
        setThreads(nextThreads);
        setSelectedThreadId((current) => {
          if (!current) return null;
          return nextThreads.some((thread) => String(thread.threadId) === String(current)) ? current : null;
        });
      } catch (err) {
        if (!mounted) return;
        setMessage(err.response?.data?.message || "Failed to load chats");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchThreads();

    const intervalId = window.setInterval(fetchThreads, 7000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread.threadId) === String(selectedThreadId)) || null,
    [selectedThreadId, threads]
  );

  const totalUnread = useMemo(
    () => threads.reduce((count, thread) => count + Number(thread.unreadCount || 0), 0),
    [threads]
  );

  const handleThreadSelect = async (threadId) => {
    setSelectedThreadId(threadId);

    setThreads((prev) =>
      prev.map((thread) =>
        String(thread.threadId) === String(threadId)
          ? { ...thread, unreadCount: 0, hasUnread: false }
          : thread
      )
    );

    try {
      await api.patch(`/chats/${threadId}/seen`);
    } catch {
      // Silent failure: polling will reconcile unread state shortly.
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>Chats</span>
            <h1 style={styles.title}>Conversations</h1>
            <p style={styles.subtitle}>Select a person to open the conversation. Item details stay visible as secondary context under each user.</p>
          </div>
          <div style={styles.summaryWrap}>
            <div style={styles.summaryCard}>
              <span style={styles.summaryLabel}>Active threads</span>
              <strong style={styles.summaryValue}>{threads.length}</strong>
            </div>
            <div style={styles.summaryCardSoft}>
              <span style={styles.summaryLabelSoft}>Unread</span>
              <strong style={styles.summaryValueSoft}>{totalUnread}</strong>
            </div>
          </div>
        </div>

        {message ? <p style={styles.alert}>{message}</p> : null}

        <div style={styles.layout}>
          <section style={styles.listPanel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Your chats</h2>
              <span style={styles.panelHint}>User-first view</span>
            </div>

            {loading ? <p style={styles.emptyState}>Loading chats...</p> : null}
            {!loading && threads.length === 0 ? (
              <p style={styles.emptyState}>No chats yet. Open an item to start the initial conversation.</p>
            ) : null}

            <div style={styles.threadList}>
              {threads.map((thread) => {
                const isSelected = String(thread.threadId) === String(selectedThreadId);
                return (
                  <button
                    key={thread.threadId}
                    type="button"
                    onClick={() => handleThreadSelect(thread.threadId)}
                    style={{
                      ...styles.threadCard,
                      ...(isSelected ? styles.threadCardActive : {})
                    }}
                  >
                    <div style={styles.threadTopRow}>
                      <div style={styles.identityWrap}>
                        <div style={styles.avatarBadge}>
                          {thread.counterpart?.profileImage ? (
                            <img
                              src={thread.counterpart.profileImage}
                              alt={getDisplayName(thread.counterpart)}
                              style={styles.avatarImage}
                            />
                          ) : (
                            getInitials(getDisplayName(thread.counterpart))
                          )}
                        </div>
                        <div>
                          <strong style={styles.threadUserName}>{getDisplayName(thread.counterpart)}</strong>
                          <p style={styles.threadItemMeta}>Item: {thread.item?.title || "Item"}</p>
                        </div>
                      </div>
                      {thread.unreadCount > 0 ? (
                        <span style={styles.badgeUnread}>{thread.unreadCount} new</span>
                      ) : (
                        <span style={styles.badgeSeen}>Seen</span>
                      )}
                    </div>

                    <p style={styles.threadPreview}>
                      {thread.preview?.message || "No messages yet. This thread is ready for the first note."}
                    </p>

                    <div style={styles.threadFooter}>
                      <span style={styles.threadTime}>{formatDate(thread.lastMessageAt) || "New thread"}</span>
                      <span style={styles.threadStatus}>{thread.rentalId ? "Rental chat" : "Initial chat"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={styles.chatPanel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>{selectedThread ? getDisplayName(selectedThread.counterpart) : "Open a thread"}</h2>
              <span style={styles.panelHint}>{selectedThread ? `Item: ${selectedThread.item?.title || "Item"}` : "Shared conversation"}</span>
            </div>

            {selectedThread ? (
              <RentalChatPanel
                key={selectedThread.threadId}
                rentalId={selectedThread.rentalId || undefined}
                itemId={!selectedThread.rentalId ? selectedThread.itemId : undefined}
                title={getDisplayName(selectedThread.counterpart)}
                hint={`Regarding ${selectedThread.item?.title || "item"}.`}
              />
            ) : (
              <div style={styles.placeholderCard}>
                <h3 style={styles.placeholderTitle}>Select a chat thread</h3>
                <p style={styles.placeholderText}>Your selected conversation will open here so you can send messages without leaving this page.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Chats;

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px 16px 36px",
    background: "linear-gradient(180deg, #eef2ff 0%, #e2e8f0 100%)",
  },
  shell: {
    maxWidth: 1260,
    margin: "0 auto",
    borderRadius: 22,
    padding: 18,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(255,255,255,0.9)",
    boxShadow: "0 24px 56px rgba(15,23,42,0.10)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    alignItems: "stretch",
    marginBottom: 16,
  },
  eyebrow: {
    display: "inline-block",
    marginBottom: 6,
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "#0b1220",
    fontSize: 42,
    lineHeight: 1.04,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#52627a",
    maxWidth: 780,
    lineHeight: 1.5,
    fontSize: 18,
  },
  summaryWrap: {
    display: "flex",
    gap: 10,
    alignItems: "stretch",
  },
  summaryCard: {
    minWidth: 162,
    borderRadius: 16,
    padding: 14,
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  summaryCardSoft: {
    minWidth: 124,
    borderRadius: 16,
    padding: 14,
    border: "1px solid rgba(148,163,184,0.35)",
    background: "#f8fafc",
    color: "#0f172a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.75,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryLabelSoft: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 28,
    lineHeight: 1.1,
  },
  summaryValueSoft: {
    fontSize: 28,
    lineHeight: 1.1,
    color: "#0f172a",
  },
  alert: {
    margin: "0 0 14px",
    padding: "12px 14px",
    borderRadius: 12,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "430px 1fr",
    gap: 18,
    alignItems: "start",
  },
  listPanel: {
    borderRadius: 18,
    padding: 16,
    background: "#f8fafc",
    border: "1px solid rgba(203,213,225,0.95)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  chatPanel: {
    minWidth: 0,
    borderRadius: 18,
    padding: 14,
    background: "#f8fafc",
    border: "1px solid rgba(203,213,225,0.95)",
    boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  panelTitle: {
    margin: 0,
    fontSize: 30,
    lineHeight: 1.1,
    color: "#111827",
    letterSpacing: -0.3,
  },
  panelHint: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 700,
  },
  emptyState: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  threadList: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 4,
    maxHeight: "min(560px, calc(100vh - 260px))",
  },
  threadCard: {
    width: "100%",
    textAlign: "left",
    borderRadius: 14,
    border: "1px solid #d6dee8",
    background: "#fff",
    padding: 12,
    cursor: "pointer",
    boxShadow: "0 6px 14px rgba(15,23,42,0.05)",
    transition: "all 0.18s ease",
  },
  threadCardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 10px 22px rgba(37,99,235,0.18)",
    transform: "translateY(-1px)",
  },
  threadTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  identityWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.4,
    flexShrink: 0,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  threadUserName: {
    display: "block",
    color: "#0f172a",
    fontSize: 18,
    lineHeight: 1.15,
  },
  threadItemMeta: {
    margin: "2px 0 0",
    color: "#64748b",
    fontSize: 12,
  },
  badgeUnread: {
    borderRadius: 999,
    padding: "4px 9px",
    background: "#16a34a",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    letterSpacing: 0.2,
  },
  badgeSeen: {
    borderRadius: 999,
    padding: "4px 9px",
    background: "#e2e8f0",
    color: "#475569",
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    letterSpacing: 0.2,
  },
  threadPreview: {
    margin: "10px 0 8px",
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.45,
    minHeight: 38,
  },
  threadFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  threadTime: {
    color: "#94a3b8",
    fontSize: 12,
  },
  threadStatus: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 700,
  },
  placeholderCard: {
    borderRadius: 16,
    minHeight: 600,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    border: "1px dashed #cbd5e1",
    background: "#fff",
    padding: 24,
  },
  placeholderTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 32,
    lineHeight: 1.08,
  },
  placeholderText: {
    margin: "12px 0 0",
    color: "#475569",
    maxWidth: 460,
    lineHeight: 1.55,
    fontSize: 21,
  },
};