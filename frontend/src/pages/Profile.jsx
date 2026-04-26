import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/auth-context";
import api from "../services/api";

const getTrustBadge = (score = 0) => {
  if (score >= 85) return { label: "Gold", color: "#b45309" };
  if (score >= 70) return { label: "Trusted", color: "#374151" };
  if (score >= 55) return { label: "Verified", color: "#4b5563" };
  return { label: "New", color: "#6b7280" };
};

const getStatusColor = (status) => {
  switch (status) {
    case "requested": return "#f59e0b";
    case "approved": return "#6b7280";
    case "active": return "#374151";
    case "returned": return "#6b7280";
    case "cancelled": return "#ef4444";
    case "disputed": return "#991b1b";
    default: return "#6b7280";
  }
};

function Profile() {
  const { user } = useContext(AuthContext);
  const [listings, setListings] = useState([]);
  const [myRentals, setMyRentals] = useState([]);
  const [ownerRequests, setOwnerRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const badge = getTrustBadge(user?.trustScore || 0);

  useEffect(() => {
    const fetchActivityData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [listingsRes, rentalsRes, requestsRes] = await Promise.all([
          api.get("/items/my-items").catch(() => ({ data: [] })),
          api.get("/rentals/my-rentals").catch(() => ({ data: [] })),
          api.get("/rentals/owner-rentals").catch(() => ({ data: [] }))
        ]);

        setListings(Array.isArray(listingsRes.data) ? listingsRes.data : []);
        setMyRentals(Array.isArray(rentalsRes.data) ? rentalsRes.data : []);
        setOwnerRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
      } catch (err) {
        setError("Failed to load activity data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivityData();
  }, [user?._id]);

  if (!user) return <h2 style={{ padding: 20 }}>Loading profile...</h2>;

  if (loading) {
    return <h2 style={{ padding: 20 }}>Loading activity data...</h2>;
  }

  const rentalStats = {
    requested: myRentals.filter(r => r.status === "requested").length,
    approved: myRentals.filter(r => r.status === "approved").length,
    active: myRentals.filter(r => r.status === "active").length,
    returned: myRentals.filter(r => r.status === "returned").length,
    disputed: myRentals.filter(r => r.status === "disputed").length,
  };

  const ownerStats = {
    requested: ownerRequests.filter(r => r.status === "requested").length,
    approved: ownerRequests.filter(r => r.status === "approved").length,
    active: ownerRequests.filter(r => r.status === "active").length,
  };

  const totalListings = listings.length;
  const totalRentals = myRentals.length;
  const totalRequests = ownerRequests.length;

  const recentListings = listings.slice(0, 3);
  const recentRentals = myRentals.slice(0, 3);
  const recentRequests = ownerRequests.slice(0, 3);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER SECTION */}
        <div style={styles.headerSection}>
          <div style={styles.avatarBox}>
            <div style={styles.avatar}>
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
          <div style={styles.headerInfo}>
            <h1 style={styles.name}>{user.name}</h1>
            <p style={styles.email}>{user.email}</p>
            <div style={styles.badgeRow}>
              <span style={{ ...styles.badge, background: badge.color }}>
                ⭐ {badge.label}
              </span>
              {user.verified && (
                <span style={styles.verifiedBadge}>✓ Verified</span>
              )}
              {user.blocked && (
                <span style={styles.blockedBadge}>⛔ Blocked</span>
              )}
            </div>
          </div>
        </div>

        {error && <p style={styles.errorMessage}>{error}</p>}

        {/* STATS OVERVIEW */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Trust Score</p>
            <h3 style={styles.statValue}>{user.trustScore || 50}</h3>
            <p style={styles.statHint}>Out of 100</p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>My Listings</p>
            <h3 style={styles.statValue}>{totalListings}</h3>
            <p style={styles.statHint}>Items you own</p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>Rentals</p>
            <h3 style={styles.statValue}>{totalRentals}</h3>
            <p style={styles.statHint}>Items rented as renter</p>
          </div>

          <div style={styles.statCard}>
            <p style={styles.statLabel}>Requests</p>
            <h3 style={styles.statValue}>{totalRequests}</h3>
            <p style={styles.statHint}>Pending on your items</p>
          </div>
        </div>

        {/* ACCOUNT DETAILS */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Account Details</h2>
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Email</span>
              <span style={styles.detailValue}>{user.email}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Phone</span>
              <span style={styles.detailValue}>{user.phone || "Not provided"}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Role</span>
              <span style={styles.detailValue}>
                {user.role === "admin" ? "Admin" : "User"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Status</span>
              <span style={styles.detailValue}>
                {user.blocked ? "Blocked" : user.verified ? "Verified" : "Unverified"}
              </span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>City</span>
              <span style={styles.detailValue}>{user.city || "Not set"}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Member Since</span>
              <span style={styles.detailValue}>
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
              </span>
            </div>
          </div>
        </div>

        {/* LOCATION CARD */}
        {(user.city || (user.location?.coordinates?.[1] && user.location?.coordinates?.[0])) && (
          <div style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>📍 Location</h2>
            <div style={styles.locationContent}>
              <p style={styles.locationCity}>{user.city || "Location available"}</p>
              {user.location?.coordinates && (
                <p style={styles.locationCoords}>
                  {Number(user.location.coordinates[1]).toFixed(5)}, {Number(user.location.coordinates[0]).toFixed(5)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* RENTALS SECTION */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>My Rentals (as Renter)</h2>
          {totalRentals === 0 ? (
            <p style={styles.emptyState}>You haven't rented any items yet.</p>
          ) : (
            <>
              <div style={styles.statusSummary}>
                {rentalStats.requested > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#f59e0b" }} />
                    Requested: {rentalStats.requested}
                  </div>
                )}
                {rentalStats.approved > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#6b7280" }} />
                    Approved: {rentalStats.approved}
                  </div>
                )}
                {rentalStats.active > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#374151" }} />
                    Active: {rentalStats.active}
                  </div>
                )}
                {rentalStats.returned > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#6b7280" }} />
                    Returned: {rentalStats.returned}
                  </div>
                )}
                {rentalStats.disputed > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#991b1b" }} />
                    Reported Issues: {rentalStats.disputed}
                  </div>
                )}
              </div>

              {recentRentals.length > 0 && (
                <div style={styles.recentList}>
                  <p style={styles.recentLabel}>Recent rentals</p>
                  {recentRentals.map((rental) => (
                    <div key={rental._id} style={styles.recentItem}>
                      <div>
                        <p style={styles.recentItemTitle}>{rental.item?.title || "Item"}</p>
                        <p style={styles.recentItemMeta}>
                          {new Date(rental.startDate).toLocaleDateString()} → {new Date(rental.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        style={{
                          ...styles.recentStatus,
                          background: getStatusColor(rental.status),
                        }}
                      >
                        {rental.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* OWNER REQUESTS SECTION */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Rental Requests (on Your Items)</h2>
          {totalRequests === 0 ? (
            <p style={styles.emptyState}>No rental requests on your items.</p>
          ) : (
            <>
              <div style={styles.statusSummary}>
                {ownerStats.requested > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#f59e0b" }} />
                    Pending: {ownerStats.requested}
                  </div>
                )}
                {ownerStats.approved > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#6b7280" }} />
                    Approved: {ownerStats.approved}
                  </div>
                )}
                {ownerStats.active > 0 && (
                  <div style={styles.statusChip}>
                    <span style={{ ...styles.chipIndicator, background: "#374151" }} />
                    Active: {ownerStats.active}
                  </div>
                )}
              </div>

              {recentRequests.length > 0 && (
                <div style={styles.recentList}>
                  <p style={styles.recentLabel}>Recent requests</p>
                  {recentRequests.map((request) => (
                    <div key={request._id} style={styles.recentItem}>
                      <div>
                        <p style={styles.recentItemTitle}>{request.item?.title || "Item"}</p>
                        <p style={styles.recentItemMeta}>
                          Renter: {request.renter?.email || "Unknown"}
                        </p>
                      </div>
                      <span
                        style={{
                          ...styles.recentStatus,
                          background: getStatusColor(request.status),
                        }}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* LISTINGS SECTION */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>My Listings</h2>
          {totalListings === 0 ? (
            <p style={styles.emptyState}>You haven't created any listings yet.</p>
          ) : (
            <>
              <p style={styles.listingCount}>You have {totalListings} active item{totalListings !== 1 ? "s" : ""}</p>
              {recentListings.length > 0 && (
                <div style={styles.recentList}>
                  <p style={styles.recentLabel}>Recent listings</p>
                  {recentListings.map((item) => (
                    <div key={item._id} style={styles.recentItem}>
                      <div>
                        <p style={styles.recentItemTitle}>{item.title}</p>
                        <p style={styles.recentItemMeta}>
                          INR {item.pricePerDay}/day • {item.category}
                        </p>
                      </div>
                      <span style={styles.itemBadge}>
                        {item.isAvailable ? "Available" : "Rented"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(1200px 420px at 50% -5%, #ffffff 0%, #f3f4f6 42%, #e5e7eb 100%)",
    padding: "24px 16px 36px",
  },
  container: {
    maxWidth: 1100,
    margin: "0 auto",
  },
  headerSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 28,
    padding: 24,
    background: "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(243,244,246,0.88) 100%)",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 18,
    boxShadow: "0 16px 36px rgba(17, 24, 39, 0.08)",
    backdropFilter: "blur(16px) saturate(140%)",
  },
  avatarBox: {
    flex: "0 0 auto",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    background: "linear-gradient(180deg, #4b5563 0%, #1f2937 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    fontWeight: 800,
    boxShadow: "0 12px 28px rgba(17, 24, 39, 0.22)",
    border: "3px solid rgba(255,255,255,0.5)",
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    margin: 0,
    fontSize: 32,
    fontWeight: 800,
    color: "#111827",
    letterSpacing: 0.2,
  },
  email: {
    margin: "8px 0 12px",
    color: "#6b7280",
    fontSize: 15,
  },
  badgeRow: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  badge: {
    display: "inline-block",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 999,
  },
  verifiedBadge: {
    display: "inline-block",
    background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 999,
  },
  blockedBadge: {
    display: "inline-block",
    background: "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 999,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    padding: 16,
    background: "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(243,244,246,0.84) 100%)",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 14,
    boxShadow: "0 10px 22px rgba(17,24,39,0.08)",
    backdropFilter: "blur(14px) saturate(135%)",
    textAlign: "center",
  },
  statLabel: {
    margin: 0,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    margin: "8px 0 4px",
    color: "#111827",
    fontSize: 28,
    fontWeight: 800,
  },
  statHint: {
    margin: 0,
    color: "#9ca3af",
    fontSize: 12,
  },
  sectionCard: {
    padding: 20,
    background: "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(243,244,246,0.86) 100%)",
    border: "1px solid rgba(209,213,219,0.85)",
    borderRadius: 16,
    boxShadow: "0 12px 28px rgba(17,24,39,0.08)",
    backdropFilter: "blur(16px) saturate(140%)",
    marginBottom: 20,
  },
  sectionTitle: {
    margin: "0 0 16px",
    color: "#111827",
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  detailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 12,
    background: "rgba(250,250,250,0.84)",
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    backdropFilter: "blur(12px)",
  },
  detailLabel: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: 600,
    wordBreak: "break-word",
  },
  locationContent: {
    padding: 14,
    background: "rgba(250,250,250,0.84)",
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    backdropFilter: "blur(12px)",
  },
  locationCity: {
    margin: 0,
    color: "#111827",
    fontSize: 16,
    fontWeight: 700,
  },
  locationCoords: {
    margin: "6px 0 0",
    color: "#6b7280",
    fontSize: 13,
    fontFamily: "monospace",
  },
  statusSummary: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  statusChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    background: "rgba(250,250,250,0.84)",
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },
  chipIndicator: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
  emptyState: {
    margin: 0,
    color: "#6b7280",
    fontSize: 14,
    fontStyle: "italic",
  },
  recentList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  recentLabel: {
    margin: "0 0 12px",
    color: "#6b7280",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  recentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    background: "rgba(250,250,250,0.84)",
    border: "1px solid rgba(229,231,235,0.95)",
    borderRadius: 10,
    backdropFilter: "blur(12px)",
    gap: 12,
  },
  recentItemTitle: {
    margin: 0,
    color: "#111827",
    fontSize: 14,
    fontWeight: 700,
  },
  recentItemMeta: {
    margin: "4px 0 0",
    color: "#6b7280",
    fontSize: 12,
  },
  recentStatus: {
    display: "inline-block",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  listingCount: {
    margin: "0 0 16px",
    color: "#6b7280",
    fontSize: 13,
  },
  itemBadge: {
    display: "inline-block",
    background: "linear-gradient(180deg, #10b981 0%, #059669 100%)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 6,
    whiteSpace: "nowrap",
  },
  errorMessage: {
    margin: "0 0 16px",
    padding: 12,
    background: "#fee2e2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 14,
  },
};