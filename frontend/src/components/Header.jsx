import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, Sun, Moon, LogOut, Bell } from 'lucide-react';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1); // Track unread count
  const notificationRef = useRef(null);
  
  const notifications = [
    { id: 1, message: "Welcome to AI Expense Tracker!", type: "info", time: "Just now", read: false },
  ];

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      // Mark as read when opened
      setUnreadCount(0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="hidden md:block">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Welcome back!
            </h2>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <Bell className="w-6 h-6" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            
            {/* Notifications dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <p className="text-sm text-gray-900 dark:text-white">{notif.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      No notifications
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            {user?.profile_pic ? (
              <img
                src={user.profile_pic}
                alt={user?.name}
                className="w-10 h-10 rounded-full border-2 border-purple-500 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=8b5cf6&color=fff`;
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-purple-500 bg-purple-600 flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400"
            title="Logout"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
