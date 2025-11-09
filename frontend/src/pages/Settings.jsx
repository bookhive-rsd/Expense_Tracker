import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Save, Loader, CheckCircle } from 'lucide-react';

const Settings = () => {
  const { user, API_URL, token } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [settings, setSettings] = useState({
    language: 'en',
    currency: 'INR',
    email_notifications: true,
    push_notifications: true,
    weekly_report: true,
    monthly_report: true,
    yearly_report: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/settings/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Fetched settings:', response.data);
      
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // If settings don't exist, use defaults
      if (error.response?.status === 404) {
        console.log('Using default settings');
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setShowSuccess(false);
    
    try {
      console.log('Saving settings:', settings);
      
      const response = await axios.put(
        `${API_URL}/api/settings/preferences`, 
        settings,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Settings saved successfully:', response.data);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reload the page to apply changes throughout the app
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to save settings: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    // Give a moment for the theme to update
    setTimeout(() => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 animate-fadeIn">
          <CheckCircle className="w-5 h-5" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account preferences
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Profile Information
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-4">
            <img
              src={user?.profile_pic || 'https://via.placeholder.com/80'}
              alt={user?.name}
              className="w-20 h-20 rounded-full border-2 border-purple-500"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=8b5cf6&color=fff&size=80`;
              }}
            />
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {user?.name}
              </p>
              <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current: {settings.language === 'en' ? 'English' : settings.language === 'hi' ? 'Hindi' : settings.language === 'es' ? 'Spanish' : 'French'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Current: {settings.currency === 'INR' ? '₹ Indian Rupee' : settings.currency === 'USD' ? '$ US Dollar' : settings.currency === 'EUR' ? '€ Euro' : '£ British Pound'}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={handleDarkModeToggle}
                className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium">Dark Mode</span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {darkMode ? 'Currently enabled' : 'Currently disabled'}
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
        </div>
        
        <div className="p-6 space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <input
              type="checkbox"
              checked={settings.email_notifications}
              onChange={(e) => setSettings({...settings, email_notifications: e.target.checked})}
              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Email Notifications</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive updates and alerts via email
              </p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <input
              type="checkbox"
              checked={settings.push_notifications}
              onChange={(e) => setSettings({...settings, push_notifications: e.target.checked})}
              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex-1">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Push Notifications</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Receive browser push notifications
              </p>
            </div>
          </label>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Email Reports
            </p>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="checkbox"
                  checked={settings.weekly_report}
                  onChange={(e) => setSettings({...settings, weekly_report: e.target.checked})}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-gray-700 dark:text-gray-300">Weekly Report</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive weekly expense summaries
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="checkbox"
                  checked={settings.monthly_report}
                  onChange={(e) => setSettings({...settings, monthly_report: e.target.checked})}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-gray-700 dark:text-gray-300">Monthly Report</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive monthly expense summaries
                  </p>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <input
                  type="checkbox"
                  checked={settings.yearly_report}
                  onChange={(e) => setSettings({...settings, yearly_report: e.target.checked})}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-gray-700 dark:text-gray-300">Yearly Report</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive yearly expense summaries
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={fetchSettings}
          className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Settings;
