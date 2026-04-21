import { useEffect, useState } from "react";
import api from "../services/api";

function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("users");
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
          api.get("/admin/cases", { params: { page: 1, limit: 100 } })
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

      setUsers(prev =>
        prev.map(u =>
          u._id === id ? { ...u, verified: true } : u
        )
      );
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to verify user");
    }
  };

  const toggleBlock = async (id) => {
    try {
      setMessage("");
      const res = await api.patch(`/admin/block/${id}`);

      setUsers(prev =>
        prev.map(u =>
          u._id === id ? { ...u, blocked: res.data.blocked } : u
        )
      );
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
      setRentals((prev) =>
        prev.map((r) => (r._id === id ? { ...r, ...res.data.rental } : r))
      );
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resolve dispute");
    }
  };

  const updateCaseStatus = async (id, status) => {
    try {
      setMessage("");
      const res = await api.patch(`/admin/cases/${id}/status`, { status });
      setCases((prev) =>
        prev.map((caseItem) =>
          caseItem._id === id ? { ...caseItem, ...res.data.caseFile } : caseItem
        )
      );
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
    return {
      data: list.slice(start, start + PAGE_SIZE),
      totalPages,
      currentPage,
    };
  };

  const usersFiltered = users.filter((u) => {
    const q = usersQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const itemsFiltered = items.filter((item) => {
    const q = itemsQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.title?.toLowerCase().includes(q) ||
      item.owner?.email?.toLowerCase().includes(q)
    );
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

  if (loading) {
    return <h2 style={{ padding: 24 }}>Loading admin control center...</h2>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Admin Control Center</h1>
      {message && <p style={styles.message}>{message}</p>}

      {overview && (
        <div style={styles.statsGrid}>
          <div style={styles.statCard}><p>Total Users</p><h3>{overview.totalUsers}</h3></div>
          <div style={styles.statCard}><p>Total Items</p><h3>{overview.totalItems}</h3></div>
          <div style={styles.statCard}><p>Total Rentals</p><h3>{overview.totalRentals}</h3></div>
          <div style={styles.statCard}><p>Active Rentals</p><h3>{overview.activeRentals}</h3></div>
          <div style={styles.statCard}><p>Disputed</p><h3>{overview.disputedRentals}</h3></div>
          <div style={styles.statCard}><p>Open Cases</p><h3>{overview.openCases}</h3></div>
          <div style={styles.statCard}><p>Revenue</p><h3>INR {overview.totalRevenue}</h3></div>
        </div>
      )}

      <div style={styles.tabs}>
        <button style={activeTab === "users" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("users")}>Users</button>
        <button style={activeTab === "items" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("items")}>Items</button>
        <button style={activeTab === "rentals" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("rentals")}>Rentals</button>
        <button style={activeTab === "disputes" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("disputes")}>Disputes</button>
        <button style={activeTab === "cases" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("cases")}>Case Files</button>
      </div>

      {activeTab === "users" && (
        <div style={styles.panel}>
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
            <button style={styles.tab} onClick={() => setUsersPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span style={styles.rowMeta}>Page {usersPageData.currentPage} / {usersPageData.totalPages}</span>
            <button style={styles.tab} onClick={() => setUsersPage((p) => Math.min(usersPageData.totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === "items" && (
        <div style={styles.panel}>
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
            <button style={styles.tab} onClick={() => setItemsPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span style={styles.rowMeta}>Page {itemsPageData.currentPage} / {itemsPageData.totalPages}</span>
            <button style={styles.tab} onClick={() => setItemsPage((p) => Math.min(itemsPageData.totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === "rentals" && (
        <div style={styles.panel}>
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
            <button style={styles.tab} onClick={() => setRentalsPage((p) => Math.max(1, p - 1))}>
              Prev
            </button>
            <span style={styles.rowMeta}>Page {rentalsPageData.currentPage} / {rentalsPageData.totalPages}</span>
            <button style={styles.tab} onClick={() => setRentalsPage((p) => Math.min(rentalsPageData.totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      )}

      {activeTab === "disputes" && (
        <div style={styles.panel}>
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
    padding: 24,
  },
  title: {
    color: "#1f2937",
    marginBottom: 12,
  },
  message: {
    color: "#b91c1c",
  },
  statsGrid: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 12,
  },
  statCard: {
    border: "1px solid #d1d5db",
    background: "#f9fafb",
    borderRadius: 12,
    padding: 14,
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginTop: 18,
    flexWrap: "wrap",
  },
  tab: {
    border: "1px solid #d1d5db",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#374151",
    padding: "8px 12px",
    cursor: "pointer",
  },
  tabActive: {
    border: "1px solid #9ca3af",
    borderRadius: 999,
    background: "#374151",
    color: "#fff",
    padding: "8px 12px",
    cursor: "pointer",
  },
  panel: {
    marginTop: 14,
    display: "grid",
    gap: 12,
  },
  searchInput: {
    border: "1px solid #d1d5db",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 12px",
    color: "#111827",
  },
  rowCard: {
    border: "1px solid #d1d5db",
    background: "#f8f9fb",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap",
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
  },
  primaryBtn: {
    background: "#374151",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  mutedBtn: {
    background: "#6b7280",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#991b1b",
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
  },
};