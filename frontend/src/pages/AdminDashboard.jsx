import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("feedbacks");
  const [usersQuery, setUsersQuery] = useState("");
  const [itemsQuery, setItemsQuery] = useState("");
  const [rentalsQuery, setRentalsQuery] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [itemsPage, setItemsPage] = useState(1);
  const [rentalsPage, setRentalsPage] = useState(1);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const [overviewRes, usersRes, itemsRes, rentalsRes, casesRes] = await Promise.all([
          api.get("/admin/overview"),
          api.get("/admin/users", { params: { page: 1, limit: 100 } }),
          api.get("/admin/items", { params: { page: 1, limit: 100 } }),
          api.get("/admin/rentals", { params: { page: 1, limit: 100 } }),
          api.get("/admin/cases", { params: { page: 1, limit: 100 } }),
        ]);

        setOverview(overviewRes.data);
        setUsers(usersRes.data.data || usersRes.data || []);
        setItems(itemsRes.data.data || itemsRes.data || []);
        setRentals(rentalsRes.data.data || rentalsRes.data || []);
        setCases(casesRes.data.data || casesRes.data || []);
      } catch (err) {
        setMessage(err.response?.data?.message || "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const verifyUser = async (id) => {
    try {
      setMessage("");
      await api.patch(`/admin/approve/${id}`);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, verified: true } : u)));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to verify user");
    }
  };

  const toggleBlock = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/admin/block/${id}`);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, blocked: res.data.blocked } : u)));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update user block status");
    }
  };

  const deleteItem = async (id) => {
    try {
      setMessage("");
      await api.delete(`/admin/items/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      setRentals((prev) => prev.filter((rental) => rental.item?._id !== id));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete item");
    }
  };

  const resolveDispute = async (id, outcome) => {
    try {
      setMessage("");
      const res = await api.patch(`/admin/rentals/${id}/resolve-dispute`, { outcome });
      setRentals((prev) => prev.map((r) => (r._id === id ? { ...r, ...res.data.rental } : r)));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resolve dispute");
    }
  };

  const updateCaseStatus = async (id, status) => {
    try {
      setMessage("");
      const res = await api.patch(`/admin/cases/${id}/status`, { status });
      setCases((prev) => prev.map((caseItem) => (caseItem._id === id ? { ...caseItem, ...res.data.caseFile } : caseItem)));
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update case status");
    }
  };

  const disputedRentals = rentals.filter((rental) => rental.status === "disputed");
  const PAGE_SIZE = 6;

  const paginate = (list, page) => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(page, 1), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    return { data: list.slice(start, start + PAGE_SIZE), totalPages, currentPage };
  };

  const usersFiltered = users.filter((u) => {
    const q = usersQuery.trim().toLowerCase();
    if (!q) return true;
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const itemsFiltered = items.filter((item) => {
    const q = itemsQuery.trim().toLowerCase();
    if (!q) return true;
    return item.title?.toLowerCase().includes(q) || item.owner?.email?.toLowerCase().includes(q);
  });

  const rentalsFiltered = rentals.filter((rental) => {
    const q = rentalsQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      rental.item?.title?.toLowerCase().includes(q) ||
      rental.owner?.email?.toLowerCase().includes(q) ||
      rental.renter?.email?.toLowerCase().includes(q) ||
      rental.status?.toLowerCase().includes(q)
    );
  });

  const usersPageData = paginate(usersFiltered, usersPage);
  const itemsPageData = paginate(itemsFiltered, itemsPage);
  const rentalsPageData = paginate(rentalsFiltered, rentalsPage);

  const feedbackCards = useMemo(() => ([
    { id: 1, user: "Rajesh Kumar", rating: 4.8, feedback: "Great rental experience, items in perfect condition.", date: "2 days ago" },
    { id: 2, user: "Priya Singh", rating: 4.5, feedback: "Good service, fast delivery and pickup.", date: "5 days ago" },
    { id: 3, user: "Amit Patel", rating: 4.9, feedback: "Excellent platform, very professional handling.", date: "1 week ago" },
    { id: 4, user: "Neha Gupta", rating: 4.2, feedback: "Good experience overall, minor delay in delivery.", date: "10 days ago" },
    { id: 5, user: "Vikram Singh", rating: 4.7, feedback: "Reliable service, would use again.", date: "2 weeks ago" },
  ]), []);

  const statCards = [
    { key: "users", title: "Total Users", value: overview?.totalUsers ?? 0, hint: "Active Marketplace" },
    { key: "items", title: "Total Items", value: overview?.totalItems ?? 0, hint: "Available to Rent" },
    { key: "rentals", title: "Total Rentals", value: overview?.totalRentals ?? 0, hint: "All Time" },
    { key: "rentals", title: "Active Rentals", value: overview?.activeRentals ?? 0, hint: "In Progress" },
    { key: "disputes", title: "Disputed Cases", value: overview?.disputedRentals ?? 0, hint: "Pending Review" },
    { key: "cases", title: "Open Cases", value: overview?.openCases ?? 0, hint: "Escalated Issues" },
    { key: "feedbacks", title: "Feedbacks", value: feedbackCards.length, hint: "Static for now" },
  ];

  if (loading) {
    return <h2 style={{ padding: 24 }}>Loading admin control center...</h2>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin Control Center</h1>
      <p style={styles.subtitle}>Use the boxes above to jump into each section. The page opens on feedbacks and ratings by default.</p>
      {message && <p style={styles.message}>{message}</p>}

      {overview && (
        <div style={styles.statsGrid}>
          {statCards.map((card) => (
            <button
              key={card.title}
              type="button"
              style={{ ...styles.statCard, ...(activeTab === card.key ? styles.statCardActive : {}) }}
              onClick={() => setActiveTab(card.key)}
            >
              <p style={styles.cardLabel}>{card.title}</p>
              <h3 style={styles.cardValue}>{card.value}</h3>
              <p style={styles.cardHint}>{card.hint}</p>
            </button>
          ))}
        </div>
      )}

      {activeTab === "feedbacks" && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>User Ratings & Feedback</h2>
            <p style={styles.sectionMeta}>Static preview for now. This section can later be connected to live review data.</p>
          </div>
          <div style={styles.feedbackGrid}>
            {feedbackCards.map((item) => (
              <div key={item.id} style={styles.feedbackCard}>
                <div style={styles.feedbackHeader}>
                  <h4 style={styles.feedbackUser}>{item.user}</h4>
                  <span style={styles.feedbackRating}>★ {item.rating}</span>
                </div>
                <p style={styles.feedbackText}>{item.feedback}</p>
                <p style={styles.feedbackDate}>{item.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Users</h2>
            <p style={styles.sectionMeta}>Approve, block, and inspect marketplace users.</p>
          </div>
          <input
            style={styles.searchInput}
            placeholder="Search users by name or email"
            value={usersQuery}
            onChange={(e) => {
              setUsersQuery(e.target.value);
              setUsersPage(1);
            }}
          />

          {usersPageData.data.map((u) => (
            <div key={u._id} style={styles.rowCard}>
              <div>
                <h3 style={styles.rowTitle}>{u.name}</h3>
                <p style={styles.rowMeta}>{u.email}</p>
                <p style={styles.rowMeta}>Trust: {u.trustScore} | Verified: {u.verified ? "Yes" : "No"} | Blocked: {u.blocked ? "Yes" : "No"}</p>
              </div>
              <div style={styles.actions}>
                {!u.verified && <button style={styles.primaryBtn} onClick={() => verifyUser(u._id)}>Verify</button>}
                <button style={styles.dangerBtn} onClick={() => toggleBlock(u._id)}>{u.blocked ? "Unblock" : "Block"}</button>
              </div>
            </div>
          ))}

          <div style={styles.pagination}>
            <button style={styles.pagerBtn} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span style={styles.rowMeta}>Page {usersPageData.currentPage} / {usersPageData.totalPages}</span>
            <button style={styles.pagerBtn} onClick={() => setUsersPage((p) => Math.min(usersPageData.totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      {activeTab === "items" && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Items</h2>
            <p style={styles.sectionMeta}>Review item listings and remove problematic entries.</p>
          </div>
          <input
            style={styles.searchInput}
            placeholder="Search items by title or owner email"
            value={itemsQuery}
            onChange={(e) => {
              setItemsQuery(e.target.value);
              setItemsPage(1);
            }}
          />

          {itemsPageData.data.map((item) => (
            <div key={item._id} style={styles.rowCard}>
              <div>
                <h3 style={styles.rowTitle}>{item.title}</h3>
                <p style={styles.rowMeta}>Owner: {item.owner?.email || "N/A"}</p>
                <p style={styles.rowMeta}>Price: INR {item.pricePerDay}/day</p>
              </div>
              <div style={styles.actions}>
                <button style={styles.dangerBtn} onClick={() => deleteItem(item._id)}>Delete Item</button>
              </div>
            </div>
          ))}

          <div style={styles.pagination}>
            <button style={styles.pagerBtn} onClick={() => setItemsPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span style={styles.rowMeta}>Page {itemsPageData.currentPage} / {itemsPageData.totalPages}</span>
            <button style={styles.pagerBtn} onClick={() => setItemsPage((p) => Math.min(itemsPageData.totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      {activeTab === "rentals" && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Rentals</h2>
            <p style={styles.sectionMeta}>Search, audit, and monitor rental activity.</p>
          </div>
          <input
            style={styles.searchInput}
            placeholder="Search rentals by title, status, or user email"
            value={rentalsQuery}
            onChange={(e) => {
              setRentalsQuery(e.target.value);
              setRentalsPage(1);
            }}
          />

          {rentalsPageData.data.map((rental) => (
            <div key={rental._id} style={styles.rowCard}>
              <div>
                <h3 style={styles.rowTitle}>{rental.item?.title || "Item"}</h3>
                <p style={styles.rowMeta}>Owner: {rental.owner?.email} | Renter: {rental.renter?.email}</p>
                <p style={styles.rowMeta}>Status: {rental.status} | Total: INR {rental.totalPrice}</p>
              </div>
            </div>
          ))}

          <div style={styles.pagination}>
            <button style={styles.pagerBtn} onClick={() => setRentalsPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span style={styles.rowMeta}>Page {rentalsPageData.currentPage} / {rentalsPageData.totalPages}</span>
            <button style={styles.pagerBtn} onClick={() => setRentalsPage((p) => Math.min(rentalsPageData.totalPages, p + 1))}>Next</button>
          </div>
        </div>
      )}

      {activeTab === "disputes" && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Disputes</h2>
            <p style={styles.sectionMeta}>Resolve active disputes from the control center.</p>
          </div>
          {disputedRentals.length === 0 && <p style={styles.rowMeta}>No open disputes.</p>}
          {disputedRentals.map((rental) => (
            <div key={rental._id} style={styles.rowCard}>
              <div>
                <h3 style={styles.rowTitle}>{rental.item?.title || "Item"}</h3>
                <p style={styles.rowMeta}>Owner: {rental.owner?.email} | Renter: {rental.renter?.email}</p>
                <p style={styles.rowMeta}>Status: {rental.status}</p>
              </div>
              <div style={styles.actions}>
                <button style={styles.primaryBtn} onClick={() => resolveDispute(rental._id, "owner_fault")}>Owner Fault</button>
                <button style={styles.primaryBtn} onClick={() => resolveDispute(rental._id, "renter_fault")}>Renter Fault</button>
                <button style={styles.mutedBtn} onClick={() => resolveDispute(rental._id, "no_fault")}>No Fault</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "cases" && (
        <div style={styles.panel}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Case Files</h2>
            <p style={styles.sectionMeta}>Escalated reports and incident handling.</p>
          </div>
          {cases.length === 0 && <p style={styles.rowMeta}>No case files yet.</p>}
          {cases.map((caseItem) => (
            <div key={caseItem._id} style={styles.rowCard}>
              <div>
                <h3 style={styles.rowTitle}>{caseItem.item?.title || "Item"}</h3>
                <p style={styles.rowMeta}>Owner: {caseItem.owner?.email} | Renter: {caseItem.renter?.email}</p>
                <p style={styles.rowMeta}>Type: {caseItem.incidentType} | Severity: {caseItem.severity}</p>
                <p style={styles.rowMeta}>Status: {caseItem.status}</p>
                {caseItem.incidentDescription && <p style={styles.rowMeta}>Issue: {caseItem.incidentDescription}</p>}
              </div>

              <div style={styles.actions}>
                <button style={styles.mutedBtn} onClick={() => updateCaseStatus(caseItem._id, "under_review")}>Under Review</button>
                <button style={styles.dangerBtn} onClick={() => updateCaseStatus(caseItem._id, "escalated")}>Escalate</button>
                <button style={styles.primaryBtn} onClick={() => updateCaseStatus(caseItem._id, "closed")}>Close</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

const styles = {
  container: {
    padding: "10px 8px 28px",
    maxWidth: 1400,
    margin: "0 auto",
  },
  title: {
    color: "#1f2937",
    marginBottom: 6,
    fontSize: 34,
    letterSpacing: 0.2,
  },
  subtitle: {
    margin: "0 0 12px",
    color: "#6b7280",
  },
  message: {
    color: "#b91c1c",
  },
  statsGrid: {
    marginTop: 14,
    display: "flex",
    flexWrap: "nowrap",
    overflowX: "auto",
    gap: 12,
    paddingBottom: 6,
    scrollbarWidth: "thin",
  },
  statCard: {
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 16,
    padding: 16,
    minHeight: 118,
    textAlign: "left",
    cursor: "pointer",
    transition: "transform 140ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 140ms cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: "blur(14px) saturate(135%)",
    boxShadow: "0 10px 22px rgba(17,24,39,0.08)",
    color: "#111827",
    background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(243,244,246,0.9) 100%)",
    minWidth: 185,
    flex: "0 0 auto",
    whiteSpace: "nowrap",
  },
  statCardActive: {
    transform: "translateY(-2px)",
    boxShadow: "0 16px 30px rgba(17,24,39,0.16)",
  },
  cardLabel: {
    margin: 0,
    color: "inherit",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardValue: {
    margin: "10px 0 4px",
    color: "inherit",
    fontSize: 28,
    fontWeight: 800,
  },
  cardHint: {
    margin: 0,
    color: "inherit",
    opacity: 0.72,
    fontSize: 12,
    fontWeight: 500,
  },
  panel: {
    marginTop: 18,
    display: "grid",
    gap: 12,
  },
  sectionHeader: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  sectionTitle: {
    color: "#1f2937",
    margin: 0,
    fontSize: 22,
  },
  sectionMeta: {
    margin: 0,
    color: "#6b7280",
    fontSize: 13,
  },
  feedbackGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },
  feedbackCard: {
    border: "1px solid rgba(209,213,219,0.8)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.9) 100%)",
    borderRadius: 14,
    padding: 16,
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 18px rgba(17,24,39,0.08)",
  },
  feedbackHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  feedbackUser: {
    margin: 0,
    color: "#111827",
    fontSize: 14,
    fontWeight: 700,
  },
  feedbackRating: {
    color: "#f59e0b",
    fontSize: 13,
    fontWeight: 700,
  },
  feedbackText: {
    margin: "8px 0",
    color: "#374151",
    fontSize: 13,
    lineHeight: 1.5,
  },
  feedbackDate: {
    margin: 0,
    color: "#9ca3af",
    fontSize: 11,
  },
  searchInput: {
    border: "1px solid rgba(209,213,219,0.85)",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#111827",
  },
  rowCard: {
    border: "1px solid rgba(209,213,219,0.85)",
    background: "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(243,244,246,0.84) 100%)",
    borderRadius: 12,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    alignItems: "start",
    backdropFilter: "blur(14px) saturate(135%)",
    boxShadow: "0 10px 22px rgba(17,24,39,0.08)",
  },
  rowTitle: {
    margin: 0,
    color: "#111827",
  },
  rowMeta: {
    margin: "4px 0 0",
    color: "#4b5563",
  },
  actions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  primaryBtn: {
    background: "linear-gradient(180deg, #4b5563 0%, #1f2937 100%)",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  mutedBtn: {
    background: "linear-gradient(180deg, #6b7280 0%, #4b5563 100%)",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  dangerBtn: {
    background: "linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  pagerBtn: {
    border: "1px solid #d1d5db",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#374151",
    padding: "8px 12px",
    cursor: "pointer",
  },
};