import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, ShoppingBag, Users, AlertCircle, Sparkles } from 'lucide-react';

const Dashboard = () => {
  const { API_URL, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupCount, setGroupCount] = useState(0);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch summary
      try {
        const summaryRes = await axios.get(`${API_URL}/api/expenses/summary/totals?period=monthly`);
        setSummary(summaryRes.data);
      } catch (error) {
        console.error('Error fetching summary:', error);
      }
      
      // Fetch trends
      try {
        const trendsRes = await axios.get(`${API_URL}/api/analytics/trends?period=monthly`);
        setTrends(trendsRes.data.trends || []);
      } catch (error) {
        console.error('Error fetching trends:', error);
      }
      
      // Fetch category breakdown
      try {
        const categoryRes = await axios.get(`${API_URL}/api/analytics/category-breakdown`);
        setCategoryData(categoryRes.data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
      
      // Fetch groups count
      try {
        const groupsRes = await axios.get(`${API_URL}/api/groups`);
        console.log('Groups response:', groupsRes.data);
        setGroupCount(Array.isArray(groupsRes.data) ? groupsRes.data.length : 0);
      } catch (error) {
        console.error('Error fetching groups:', error);
        setGroupCount(0);
      }
      
      // Fetch AI insights
      try {
        const insightsRes = await axios.get(`${API_URL}/api/ai/insights?period=monthly`);
        setInsights(insightsRes.data.insights);
      } catch (error) {
        console.error('Error fetching insights:', error);
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here's your financial overview
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ₹{summary?.total_amount?.toFixed(2) || 0}
              </p>
            </div>
            <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.by_category?.length || 0}
              </p>
            </div>
            <div className="bg-pink-100 dark:bg-pink-900 p-3 rounded-full">
              <ShoppingBag className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summary?.by_category?.reduce((sum, cat) => sum + cat.count, 0) || 0}
              </p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Groups</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {groupCount}
              </p>
            </div>
            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
              <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {insights && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-6 h-6 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
              <p className="mb-3 opacity-90">{insights.spending_pattern}</p>
              
              {insights.savings_tips && insights.savings_tips.length > 0 && (
                <div className="bg-white/10 rounded p-3 mt-3">
                  <p className="font-semibold mb-2">💡 Savings Tips:</p>
                  <ul className="space-y-1 text-sm opacity-90">
                    {insights.savings_tips.slice(0, 3).map((tip, idx) => (
                      <li key={idx}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="_id" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ _id, percentage }) => `${_id}: ${percentage?.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Top Spending Categories
        </h3>
        <div className="space-y-3">
          {summary?.by_category?.slice(0, 5).map((cat, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-gray-700 dark:text-gray-300 capitalize">
                  {cat._id}
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{cat.count} transactions</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ₹{cat.total.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;