import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Bell, CalendarClock, LogOut, MapPin, Menu, Moon, Sun, UserRound } from "lucide-react";
import { LanguageToggle } from "../ui/LanguageToggle";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../services/api";
import { Ticket } from "../../types";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationTickets, setNotificationTickets] = useState<Ticket[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || user.role === "user") {
      setNotificationCount(0);
      return;
    }

    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const params =
          user.role === "admin"
            ? { page: 1, limit: 500, status: "pending", unassigned: true }
            : { page: 1, limit: 500, status: "pending", assignedTo: user.id };

        const response = await api.get("/tickets", { params });
        if (isMounted) {
          const tickets = (response.data?.data || []) as Ticket[];
          const seenNotifications = getSeenNotifications(user.id, user.role);
          const unreadTickets = tickets.filter(
            (ticket) => !seenNotifications.has(getNotificationKey(ticket))
          );
          setNotificationCount(unreadTickets.length);
          setNotificationTickets(unreadTickets.slice(0, 8));
        }
      } catch {
        if (isMounted) {
          setNotificationCount(0);
          setNotificationTickets([]);
        }
      }
    };

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    window.addEventListener("focus", loadNotifications);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleNotificationClick = (ticket: Ticket) => {
    if (!user) return;

    const storageKey = getNotificationStorageKey(user.id, user.role);
    const seenNotifications = getSeenNotifications(user.id, user.role);
    seenNotifications.add(getNotificationKey(ticket));
    localStorage.setItem(storageKey, JSON.stringify(Array.from(seenNotifications).slice(-500)));

    setNotificationTickets((current) => current.filter((item) => item.id !== ticket.id));
    setNotificationCount((current) => Math.max(0, current - 1));
    setIsNotificationsOpen(false);
    navigate(`/tickets/${ticket.id}`);
  };

  const notificationLabel =
    user?.role === "admin"
      ? `${notificationCount} ${t("pendingReviewRequests").toLowerCase()}`
      : `${notificationCount} ${t("assignedPendingTickets").toLowerCase()}`;

  return (
    <header className="sticky top-0 z-30 flex h-16 min-h-16 shrink-0 items-center gap-4 border-b-4 border-accent-500 bg-brazil-gradient px-4 text-white shadow-sm lg:px-6">
      <button
        onClick={onToggleSidebar}
        className="rounded-lg p-2 text-white/90 hover:bg-white/10 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {(user?.role === "admin" || user?.role === "technician") && (
        <div ref={notificationRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((current) => !current)}
            title={notificationLabel}
            aria-label={notificationLabel}
            className="relative rounded-lg p-2 text-white/90 hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white dark:ring-slate-900">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white text-primary-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{t("notifications")}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {user.role === "admin" ? t("pendingReviewRequests") : t("assignedPendingTickets")}
                    </p>
                  </div>
                  {notificationCount > 0 && (
                    <span className="badge-red shrink-0">{notificationCount} {t("newNotifications")}</span>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notificationTickets.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {t("noNewNotifications")}
                  </div>
                ) : (
                  notificationTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => handleNotificationClick(ticket)}
                      className="block w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase text-brand-700 dark:text-brand-300">
                          {user.role === "admin" ? t("newRequest") : t("newAssignment")}
                        </span>
                        <span className={getPriorityBadge(ticket.priority)}>
                          {ticket.priority ? t(priorityLabelKeys[ticket.priority]) : t("undefinedPriority")}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">
                        #{ticket.id} · {ticket.title}
                      </p>

                      <div className="mt-3 grid gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <p className="flex items-center gap-2">
                          <UserRound className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{ticket.requester?.name || t("requesterUnavailable")}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{ticket.location}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                          <span>{new Date(ticket.updatedAt || ticket.createdAt).toLocaleString(locale)}</span>
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {notificationCount > notificationTickets.length && (
                <div className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  +{notificationCount - notificationTickets.length} {t("moreNotifications")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={toggleTheme}
        className="rounded-lg p-2 text-white/90 hover:bg-white/10"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>

      <LanguageToggle variant="solid" />

      <div className="flex items-center gap-3 border-l border-white/20 pl-4">
        <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-white/10 sm:flex">
          <UserRound className="h-5 w-5" />
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs capitalize text-white/75">
            {user?.role === "technician"
              ? t("technician")
              : user?.role === "admin"
                ? t("admin")
                : t("user")}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-white/90 hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

const priorityLabelKeys = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const;

function getPriorityBadge(priority: Ticket["priority"]) {
  if (priority === "critical") return "badge-red shrink-0";
  if (priority === "high") return "badge-orange shrink-0";
  if (priority === "medium") return "badge-yellow shrink-0";
  if (priority === "low") return "badge-green shrink-0";
  return "badge-gray shrink-0";
}

function getNotificationStorageKey(userId: number, role: string) {
  return `seen-ticket-notifications:${role}:${userId}`;
}

function getNotificationKey(ticket: Ticket) {
  return String(ticket.id);
}

function getSeenNotifications(userId: number, role: string) {
  try {
    const stored = localStorage.getItem(getNotificationStorageKey(userId, role));
    return new Set<string>(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set<string>();
  }
}
