import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import RentalChatPanel from "../components/RentalChatPanel";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
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
        setSelectedThreadId((current) => current || nextThreads[0]?._id || nextThreads[0]?.threadId || null);
      } catch (err) {
        if (!mounted) return;
        setMessage(err.response?.data?.message || "Failed to load chats");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchThreads();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedThread = useMemo(
    () => threads.find((thread) => String(thread.threadId) === String(selectedThreadId)) || null,
    [selectedThreadId, threads]
  );

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.header}>
          <div>
            <span style={styles.eyebrow}>Chats</span>
            <h1 style={styles.title}>Conversation inbox</h1>
            <p style={styles.subtitle}>All client and owner chats stay here. Open a thread to continue the same shared conversation.</p>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>Active threads</span>
            <strong style={styles.summaryValue}>{threads.length}</strong>
          </div>
        </div>

        {message ? <p style={styles.alert}>{message}</p> : null}

        <div style={styles.layout}>
          <section style={styles.listPanel}>
            <div style={styles.panelHeader}>
              <h2 style={styles.panelTitle}>Your chats</h2>
              <span style={styles.panelHint}>Recent activity first</span>
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
                    onClick={() => setSelectedThreadId(thread.threadId)}
                    style={{
                      ...styles.threadCard,
                      ...(isSelected ? styles.threadCardActive : {})
                    }}
                  >
                    <div style={styles.threadTopRow}>
                      <div>
                        <strong style={styles.threadTitle}>{thread.item?.title || "Item"}</strong>
                        <p style={styles.threadMeta}>with {thread.counterpart?.name || thread.counterpart?.email || "chat participant"}</p>
                      </div>
                      <span style={styles.badge}>{thread.messageCount || 0} msgs</span>
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
              <h2 style={styles.panelTitle}>{selectedThread ? selectedThread.item?.title || "Chat" : "Open a thread"}</h2>
              <span style={styles.panelHint}>Shared conversation</span>
            </div>

            {selectedThread ? (
              <RentalChatPanel
                key={selectedThread.threadId}
                rentalId={selectedThread.rentalId || undefined}
                itemId={!selectedThread.rentalId ? selectedThread.itemId : undefined}
                title={selectedThread.item?.title || "Chat"}
                hint={`Chat with ${selectedThread.counterpart?.name || selectedThread.counterpart?.email || "the other party"}.`}
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
    padding: "24px 16px 40px",
    background: "radial-gradient(1200px 520px at 50% -8%, #ffffff 0%, #eef2ff 34%, #dbe4f0 100%)",
  },
  shell: {
    maxWidth: 1240,
    margin: "0 auto",
    borderRadius: 24,
    padding: 20,
    border: "1px solid rgba(203,213,225,0.9)",
    background: "rgba(255,255,255,0.8)",
    boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
    backdropFilter: "blur(18px) saturate(150%)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
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
    color: "#0f172a",
    fontSize: 30,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#475569",
    maxWidth: 760,
    lineHeight: 1.5,
  },
  summaryCard: {
    minWidth: 150,
    borderRadius: 18,
    padding: 14,
    background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    color: "#fff",
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
  summaryValue: {
    fontSize: 28,
    lineHeight: 1.1,
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
    gridTemplateColumns: "0.95fr 1.05fr",
    gap: 16,
    alignItems: "start",
  },
  listPanel: {
    borderRadius: 20,
    padding: 16,
    background: "rgba(248,250,252,0.98)",
    border: "1px solid rgba(203,213,225,0.9)",
    boxShadow: "0 14px 28px rgba(15,23,42,0.08)",
  },
  chatPanel: {
    minWidth: 0,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  panelTitle: {
    margin: 0,
    fontSize: 18,
    color: "#111827",
  },
  panelHint: {
    color: "#64748b",
    fontSize: 12,
  },
  emptyState: {
    margin: "8px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  threadList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  threadCard: {
    width: "100%",
    textAlign: "left",
    borderRadius: 16,
    border: "1px solid #dbe2ea",
    background: "#fff",
    padding: 14,
    cursor: "pointer",
    boxShadow: "0 10px 20px rgba(15,23,42,0.06)",
  },
  threadCardActive: {
    borderColor: "#2563eb",
    boxShadow: "0 16px 30px rgba(37,99,235,0.15)",
  },
  threadTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  threadTitle: {
    display: "block",
    color: "#0f172a",
    fontSize: 15,
  },
  threadMeta: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 12,
  },
  badge: {
    borderRadius: 999,
    padding: "4px 8px",
    background: "#e0e7ff",
    color: "#1e3a8a",
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  threadPreview: {
    margin: "10px 0",
    color: "#334155",
    fontSize: 13,
    lineHeight: 1.45,
  },
  threadFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  threadTime: {
    color: "#94a3b8",
    fontSize: 11,
  },
  threadStatus: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: 700,
  },
  placeholderCard: {
    borderRadius: 20,
    minHeight: 540,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    border: "1px dashed #cbd5e1",
    background: "rgba(255,255,255,0.82)",
    padding: 24,
  },
  placeholderTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 22,
  },
  placeholderText: {
    margin: "10px 0 0",
    color: "#475569",
    maxWidth: 420,
    lineHeight: 1.5,
  },
};