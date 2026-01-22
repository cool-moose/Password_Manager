import React, { useState } from "react";
import {
  Search,
  Plus,
  Key,
  Star,
  Shield,
  AlertTriangle,
  Clock,
  TrendingUp,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Menu,
} from "lucide-react";
import { useVault, PasswordEntry } from "../context/VaultContext";
import { useActivity, formatRelativeTime } from "../context/ActivityContext";
import Sidebar from "./Sidebar";
import PasswordCard from "./PasswordCard";
import PasswordModal from "./PasswordModal";
import PasswordGenerator from "./PasswordGenerator";
import SettingsView from "./SettingsView";

type View = "passwords" | "favorites" | "generator" | "settings";

interface DashboardProps {
  onLogout: () => void;
}

// Security Score Gauge Component
const SecurityGauge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return "var(--success-color)";
    if (score >= 60) return "var(--accent-color)";
    if (score >= 40) return "var(--warning-color)";
    return "var(--danger-color)";
  };

  return (
    <div className="security-gauge">
      <div
        className="security-gauge-circle"
        style={
          {
            "--score": score,
            background: `conic-gradient(${getColor()} ${score * 3.6}deg, var(--border-color) ${score * 3.6}deg)`,
          } as React.CSSProperties
        }
      >
        <div className="security-gauge-value">
          <div className="security-gauge-score" style={{ color: getColor() }}>
            {score}
          </div>
          <div className="security-gauge-label">Score</div>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatCard: React.FC<{
  icon: React.ElementType;
  value: number | string;
  label: string;
  variant: "primary" | "success" | "warning" | "danger";
  trend?: { value: string; up: boolean };
}> = ({ icon: Icon, value, label, variant, trend }) => (
  <div className={`stat-card ${variant} stagger-item`}>
    <div className={`stat-icon ${variant}`}>
      <Icon size={24} />
    </div>
    <div className="stat-content">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {trend && (
        <div className={`stat-trend ${trend.up ? "up" : "down"}`}>
          <TrendingUp
            size={12}
            style={{ transform: trend.up ? "none" : "rotate(180deg)" }}
          />
          {trend.value}
        </div>
      )}
    </div>
  </div>
);

// Activity Item Component
const ActivityItem: React.FC<{
  type: "add" | "edit" | "delete" | "login" | "sync" | "export" | "import";
  title: string;
  subtitle: string;
  time: string;
}> = ({ type, title, subtitle, time }) => {
  const icons: Record<string, React.ElementType> = {
    add: Plus,
    edit: Activity,
    delete: AlertTriangle,
    login: Shield,
    sync: RefreshCw,
    export: Download,
    import: Upload,
  };
  const Icon = icons[type] || Activity;

  return (
    <div className="activity-item">
      <div className={`activity-icon ${type}`}>
        <Icon size={18} />
      </div>
      <div className="activity-content">
        <div className="activity-title">{title}</div>
        <div className="activity-subtitle">{subtitle}</div>
        <div className="activity-time">{time}</div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [currentView, setCurrentView] = useState<View>("passwords");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PasswordEntry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    filteredPasswords,
    searchQuery,
    setSearchQuery,
    deletePassword,
    toggleFavorite,
    selectedCategory,
    setSelectedCategory,
    passwords,
  } = useVault();

  const handleEdit = (entry: PasswordEntry) => {
    setEditEntry(entry);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditEntry(null);
  };

  // Calculate stats
  const weakPasswords = passwords.filter((p) => p.password.length < 12).length;
  const favoritesCount = passwords.filter((p) => p.favorite).length;
  const securityScore = Math.max(0, Math.min(100, 100 - weakPasswords * 10));

  // Get passwords based on current view
  const displayedPasswords =
    currentView === "favorites"
      ? passwords.filter((p) => p.favorite)
      : filteredPasswords;

  const getViewTitle = () => {
    switch (currentView) {
      case "favorites":
        return "Favorites";
      case "generator":
        return "Password Generator";
      case "settings":
        return "Settings";
      default:
        return selectedCategory ? selectedCategory : "All Passwords";
    }
  };

  const getViewSubtitle = () => {
    switch (currentView) {
      case "favorites":
        return `${displayedPasswords.length} starred passwords`;
      case "generator":
        return "Create strong, unique passwords";
      case "settings":
        return "Manage your vault preferences";
      default:
        return `${displayedPasswords.length} passwords stored`;
    }
  };

  // Get real activity data from context
  const { recentActivity } = useActivity();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        currentView={currentView}
        onViewChange={(view: View) => {
          setCurrentView(view);
          setSidebarOpen(false);
        }}
        selectedCategory={selectedCategory}
        onCategoryChange={(cat: string | null) => {
          setSelectedCategory(cat);
          setSidebarOpen(false);
        }}
        onLogout={onLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div>
            <h1 className="main-title gradient-text">{getViewTitle()}</h1>
            <p className="main-subtitle">{getViewSubtitle()}</p>
          </div>

          {(currentView === "passwords" || currentView === "favorites") && (
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              {/* Search */}
              <div className="search-bar">
                <div className="input-wrapper">
                  <Search size={18} className="input-icon" />
                  <input
                    type="text"
                    className="input-field has-icon"
                    placeholder="Search passwords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderRadius: "24px", paddingRight: "20px" }}
                  />
                </div>
              </div>

              {/* Add Button */}
              <button
                className="btn btn-primary"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={20} />
                Add Password
              </button>
            </div>
          )}
        </header>

        {/* Stats Cards - Only show on passwords view */}
        {currentView === "passwords" && !selectedCategory && (
          <div className="stats-grid">
            <StatCard
              icon={Key}
              value={passwords.length}
              label="Total Passwords"
              variant="primary"
            />
            <StatCard
              icon={AlertTriangle}
              value={weakPasswords}
              label="Weak Passwords"
              variant={weakPasswords > 0 ? "danger" : "success"}
            />
            <StatCard
              icon={Star}
              value={favoritesCount}
              label="Favorites"
              variant="warning"
            />
            <StatCard
              icon={Shield}
              value={`${securityScore}%`}
              label="Security Score"
              variant={
                securityScore >= 80
                  ? "success"
                  : securityScore >= 60
                    ? "primary"
                    : "warning"
              }
            />
          </div>
        )}

        {/* Content */}
        <div className="animate-fade-in">
          {currentView === "generator" && (
            <div style={{ maxWidth: "700px", margin: "0 auto" }}>
              <PasswordGenerator />
            </div>
          )}

          {currentView === "settings" && <SettingsView />}

          {(currentView === "passwords" || currentView === "favorites") && (
            <>
              {displayedPasswords.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    {currentView === "favorites" ? (
                      <Star size={48} />
                    ) : searchQuery ? (
                      <Search size={48} />
                    ) : (
                      <Key size={48} />
                    )}
                  </div>
                  <h2 className="empty-state-title">
                    {currentView === "favorites"
                      ? "No favorites yet"
                      : searchQuery
                        ? "No results found"
                        : "No passwords yet"}
                  </h2>
                  <p className="empty-state-text">
                    {currentView === "favorites"
                      ? "Star your most important passwords for quick access"
                      : searchQuery
                        ? `No passwords match "${searchQuery}"`
                        : "Add your first password to get started"}
                  </p>
                  {!searchQuery && currentView !== "favorites" && (
                    <button
                      className="btn btn-primary"
                      onClick={() => setIsModalOpen(true)}
                    >
                      <Plus size={20} />
                      Add Your First Password
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: "32px" }}>
                  {/* Password Grid */}
                  <div style={{ flex: 1 }}>
                    <div className="password-grid">
                      {displayedPasswords.map((entry, index) => (
                        <div
                          key={entry.id}
                          className="stagger-item"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <PasswordCard
                            entry={entry}
                            onEdit={handleEdit}
                            onDelete={deletePassword}
                            onToggleFavorite={toggleFavorite}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar with Security Score and Activity - Only on main passwords view */}
                  {currentView === "passwords" &&
                    !selectedCategory &&
                    passwords.length > 0 && (
                      <div style={{ width: "300px", flexShrink: 0 }}>
                        {/* Security Score Card */}
                        <div
                          className="glass-card"
                          style={{
                            padding: "24px",
                            marginBottom: "24px",
                            textAlign: "center",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "0.9rem",
                              color: "var(--text-secondary)",
                              marginBottom: "20px",
                            }}
                          >
                            Vault Security
                          </h3>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              marginBottom: "16px",
                            }}
                          >
                            <SecurityGauge score={securityScore} />
                          </div>
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {securityScore >= 80
                              ? "Excellent security!"
                              : securityScore >= 60
                                ? "Good, but room for improvement"
                                : "Consider strengthening your passwords"}
                          </p>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="glass-card" style={{ padding: "24px" }}>
                          <h3
                            style={{
                              fontSize: "0.9rem",
                              color: "var(--text-secondary)",
                              marginBottom: "16px",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <Clock size={16} />
                            Recent Activity
                          </h3>
                          <div className="activity-timeline">
                            {recentActivity.slice(0, 5).map((activity) => (
                              <ActivityItem
                                key={activity.id}
                                type={activity.type}
                                title={activity.title}
                                subtitle={activity.subtitle}
                                time={formatRelativeTime(activity.time)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal */}
      <PasswordModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editEntry={editEntry}
      />

      {/* Floating Action Button */}
      {(currentView === "passwords" || currentView === "favorites") && (
        <button
          className="fab"
          onClick={() => setIsModalOpen(true)}
          title="Add new password"
          style={{ display: "none" }} // Hidden on desktop, can show on mobile
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
};
