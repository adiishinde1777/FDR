import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, TEST_ACCOUNTS } from '../../context/AuthContext';
import { Bell, LogOut, UserCircle, Shield, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { NotificationItem, UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { user, logout, quickLogin } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      // ignore
    }
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleSwitcher(false);
    await quickLogin(role);
    navigate('/dashboard');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* Government Tricolor Top Stripe */}
      <div className="h-1.5 w-full flex">
        <div className="bg-[#ff9933] flex-1"></div>
        <div className="bg-white flex-1 border-y border-slate-200"></div>
        <div className="bg-[#128807] flex-1"></div>
      </div>

      <div className="px-6 py-2.5 flex items-center justify-between">
        {/* Left: AICTE Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-full bg-aicte-navy text-white flex items-center justify-center font-serif font-black text-xl shadow-inner border border-amber-400">
            A
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                GOVERNMENT OF INDIA
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                OFFICIAL PORTAL
              </span>
            </div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              AICTE Security Deposit & FDR Management Portal
            </h1>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-3">
          {/* Quick Role Switcher Button (Crucial for Evaluation & Pair-Programming) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
              title="Switch user role for testing"
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Role: {user?.role?.replace(/_/g, ' ')}</span>
              <RefreshCw className="w-3 h-3 text-blue-500" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Switch Test Account
                  </p>
                </div>
                {(Object.keys(TEST_ACCOUNTS) as UserRole[]).map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${
                      user?.role === role ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{TEST_ACCOUNTS[role].label}</span>
                    {user?.role === role && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Notifications ({unreadCount} unread)
                  </h4>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications recorded
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs transition-colors hover:bg-slate-50 ${
                          !n.isRead ? 'bg-blue-50/40' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-slate-900">{n.title}</p>
                          {n.priority === 'URGENT' && (
                            <span className="text-[10px] text-rose-600 font-bold flex items-center">
                              <AlertTriangle className="w-3 h-3 mr-0.5" /> Urgent
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/notifications');
                    }}
                    className="text-xs text-blue-700 font-medium hover:underline"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info */}
          <div className="flex items-center pl-3 border-l border-slate-200 space-x-2.5">
            <UserCircle className="w-8 h-8 text-slate-500" />
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user?.fullName}</p>
              <p className="text-[11px] text-slate-500 capitalize">{user?.role?.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors ml-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
