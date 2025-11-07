import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Filter, Trash2, Edit, Calendar, Users as UsersIcon } from 'lucide-react';

const Expenses = () => {
  const { API_URL } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  
  const [formData, setFormData] = useState({
    item_name: '',
    amount: '',
    category: 'food',
    payment_type: 'upi',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    is_group_expense: false,
    group_id: '',
    split_equally: true
  });

  useEffect(() => {
    fetchExpenses();
    fetchGroups();
  }, [categoryFilter]);

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/groups`);
      console.log('Groups fetched:', response.data);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = categoryFilter ? { category: categoryFilter } : {};
      const response = await axios.get(`${API_URL}/api/expenses`, { params });
      console.log('Expenses fetched:', response.data);
      
      // Verify each expense has an id
      response.data.forEach((expense, idx) => {
        if (!expense.id && !expense._id) {
          console.error(`Expense ${idx} missing id:`, expense);
        } else {
          console.log(`Expense ${idx}: id=${expense.id || expense._id}, name=${expense.item_name}`);
        }
      });
      
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date).toISOString(),
        is_group_expense: formData.is_group_expense,
        group_id: formData.is_group_expense ? formData.group_id : null,
        split_equally: formData.split_equally
      };
      
      console.log('Submitting expense:', expenseData);
      
      await axios.post(`${API_URL}/api/expenses`, expenseData);
      
      setShowForm(false);
      setFormData({
        item_name: '',
        amount: '',
        category: 'food',
        payment_type: 'upi',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        is_group_expense: false,
        group_id: '',
        split_equally: true
      });
      fetchExpenses();
      alert(formData.is_group_expense ? 'Group expense added successfully!' : 'Expense added successfully!');
    } catch (error) {
      console.error('Error creating expense:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to create expense: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/expenses/${expenseId}`);
      alert('Expense deleted successfully!');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense: ' + (error.response?.data?.detail || error.message));
    }
  };

  const filteredExpenses = expenses.filter(expense =>
    expense.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['food', 'travel', 'shopping', 'entertainment', 'health', 'utilities', 'rent', 'education', 'other'];

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your daily expenses
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No expenses found</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div
              key={expense.id || expense._id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${expense.is_group_expense ? 'bg-blue-100 dark:bg-blue-900' : 'bg-purple-100 dark:bg-purple-900'}`}>
                      {expense.is_group_expense ? (
                        <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                      ) : (
                        <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {expense.item_name}
                        </h3>
                        {expense.is_group_expense && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                            Group
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{expense.category}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="uppercase">{expense.payment_type}</span>
                      </div>
                    </div>
                  </div>
                  {expense.notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 ml-12">
                      {expense.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ₹{expense.amount.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(expense.id || expense._id)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Add Expense
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => setFormData({...formData, item_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Lunch, Coffee"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment
                  </label>
                  <select
                    value={formData.payment_type}
                    onChange={(e) => setFormData({...formData, payment_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="net_banking">Net Banking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  rows="2"
                  placeholder="Additional details..."
                />
              </div>

              {/* Group Expense Toggle */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_group_expense}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      const firstGroupId = groups.length > 0 ? groups[0].id : '';
                      console.log('Group expense toggled:', isChecked, 'First group ID:', firstGroupId);
                      setFormData({
                        ...formData, 
                        is_group_expense: isChecked,
                        group_id: isChecked ? firstGroupId : ''
                      });
                    }}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex items-center space-x-2">
                    <UsersIcon className="w-5 h-5 text-purple-600" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      This is a group expense
                    </span>
                  </div>
                </label>
              </div>

              {/* Group Selection */}
              {formData.is_group_expense && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select Group *
                    </label>
                    <select
                      required={formData.is_group_expense}
                      value={formData.group_id}
                      onChange={(e) => {
                        console.log('Group selected:', e.target.value);
                        setFormData({...formData, group_id: e.target.value});
                      }}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Choose a group...</option>
                      {groups.map(group => (
                        <option key={group.id || group._id} value={group.id || group._id}>
                          {group.name} ({(group.members?.length || 0) + 1} members)
                        </option>
                      ))}
                    </select>
                    {groups.length === 0 && (
                      <p className="text-sm text-orange-600 mt-1">
                        No groups available. Create a group first!
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.split_equally}
                        onChange={(e) => setFormData({...formData, split_equally: e.target.checked})}
                        className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Split equally among all members
                      </span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
