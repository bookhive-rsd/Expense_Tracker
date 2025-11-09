import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, X, Check } from 'lucide-react';

const Groups = () => {
  const { API_URL, user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSettleForm, setShowSettleForm] = useState(false);
  const [settleData, setSettleData] = useState({ from: '', to: '', amount: 0 });
  
  const [formData, setFormData] = useState({
    name: '',
    members: []
  });
  
  const [memberInput, setMemberInput] = useState({
    name: '',
    email: ''
  });

  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    total_amount: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0],
    paid_by: '',
    split_type: 'equal',
    splits: {}
  });

  const categories = ['food', 'travel', 'shopping', 'entertainment', 'health', 'utilities', 'rent', 'education', 'other'];

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/groups`);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    if (memberInput.name && memberInput.email) {
      setFormData({
        ...formData,
        members: [...formData.members, {
          ...memberInput,
          user_id: `temp_${Date.now()}`
        }]
      });
      setMemberInput({ name: '', email: '' });
    }
  };

  const handleRemoveMember = (index) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index)
    });
  };

  const handleViewDetails = async (group) => {
    try {
      const response = await axios.get(`${API_URL}/api/groups/${group.id}`);
      setSelectedGroup(response.data);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching group details:', error);
      setSelectedGroup(group);
      setShowDetails(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/groups`, {
        name: formData.name,
        members: formData.members
      });
      
      setShowForm(false);
      setFormData({ name: '', members: [] });
      fetchGroups();
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAddExpense = (group) => {
    setSelectedGroup(group);
    
    // Initialize with all members
    const allMembers = [
      { id: group.owner_id, name: group.owner_id === user.id ? user.name : 'Owner' },
      ...group.members.map(m => ({ id: m.user_id, name: m.name }))
    ];
    
    const initialSplits = {};
    allMembers.forEach(member => {
      initialSplits[member.id] = 0;
    });
    
    setExpenseFormData({
      description: '',
      total_amount: '',
      category: 'food',
      date: new Date().toISOString().split('T')[0],
      paid_by: user.id,
      split_type: 'equal',
      splits: initialSplits
    });
    
    setShowExpenseForm(true);
  };

  const handleExpenseAmountChange = (amount) => {
    setExpenseFormData(prev => {
      const newData = { ...prev, total_amount: amount };
      
      if (prev.split_type === 'equal') {
        const numMembers = Object.keys(prev.splits).length;
        const perPerson = amount ? parseFloat(amount) / numMembers : 0;
        const newSplits = {};
        Object.keys(prev.splits).forEach(memberId => {
          newSplits[memberId] = perPerson;
        });
        newData.splits = newSplits;
      }
      
      return newData;
    });
  };

  const handleSplitTypeChange = (type) => {
    setExpenseFormData(prev => {
      const newData = { ...prev, split_type: type };
      
      if (type === 'equal' && prev.total_amount) {
        const numMembers = Object.keys(prev.splits).length;
        const perPerson = parseFloat(prev.total_amount) / numMembers;
        const newSplits = {};
        Object.keys(prev.splits).forEach(memberId => {
          newSplits[memberId] = perPerson;
        });
        newData.splits = newSplits;
      }
      
      return newData;
    });
  };

  const handleCustomSplitChange = (memberId, amount) => {
    setExpenseFormData(prev => ({
      ...prev,
      splits: {
        ...prev.splits,
        [memberId]: parseFloat(amount) || 0
      }
    }));
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    const totalSplit = Object.values(expenseFormData.splits).reduce((sum, amt) => sum + amt, 0);
    const totalAmount = parseFloat(expenseFormData.total_amount);
    
    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      alert(`Split amounts (₹${totalSplit.toFixed(2)}) don't match total (₹${totalAmount.toFixed(2)})`);
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/groups/${selectedGroup.id}/expenses`, {
        description: expenseFormData.description,
        total_amount: totalAmount,
        paid_by: expenseFormData.paid_by,
        split_type: expenseFormData.split_type,
        splits: expenseFormData.splits,
        date: new Date(expenseFormData.date).toISOString(),
        category: expenseFormData.category
      });
      
      setShowExpenseForm(false);
      fetchGroups();
      if (showDetails) {
        handleViewDetails(selectedGroup);
      }
      alert('Expense added successfully!');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleSettleUp = (debtorId, creditorId, amount, group) => {
    setSelectedGroup(group);
    setSettleData({
      from: debtorId,
      to: creditorId,
      amount: amount
    });
    setShowSettleForm(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(
        `${API_URL}/api/groups/${selectedGroup.id}/settle`,
        null,
        {
          params: {
            from_user: settleData.from,
            to_user: settleData.to,
            amount: settleData.amount
          }
        }
      );
      
      setShowSettleForm(false);
      fetchGroups();
      if (showDetails) {
        handleViewDetails(selectedGroup);
      }
      alert('Payment settled successfully!');
    } catch (error) {
      console.error('Error settling payment:', error);
      alert('Failed to settle payment: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getUserName = (userId, group) => {
    if (userId === group.owner_id) {
      return userId === user.id ? 'You' : 'Owner';
    }
    const member = group.members?.find(m => m.user_id === userId);
    return member ? member.name : 'Unknown';
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Groups</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Split expenses with friends and family
          </p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>Create Group</span>
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">No groups yet</p>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const totalExpenses = group.expenses?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0;
            const memberCount = (group.members?.length || 0) + 1;
            
            let userTotal = 0;
            if (group.expenses) {
              for (const expense of group.expenses) {
                const userShare = expense.splits?.[user.id] || 0;
                userTotal += userShare;
              }
            }
            
            // Calculate net balance for user
            let netBalance = 0;
            const balances = group.balances || {};
            
            // What user owes
            if (balances[user.id]) {
              Object.values(balances[user.id]).forEach(amt => {
                netBalance -= amt;
              });
            }
            
            // What others owe user
            Object.entries(balances).forEach(([debtorId, creditors]) => {
              if (creditors[user.id]) {
                netBalance += creditors[user.id];
              }
            });
            
            return (
              <div
                key={group.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                      <Users className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <p>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                    <p>💰 {group.expenses?.length || 0} expense{group.expenses?.length !== 1 ? 's' : ''}</p>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Your Balance
                    </p>
                    <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                      {netBalance === 0 ? (
                        <p className="text-green-600 dark:text-green-400 font-semibold">
                          ✓ Settled up
                        </p>
                      ) : netBalance > 0 ? (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400">You'll get back</p>
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            ₹{netBalance.toFixed(2)}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 dark:text-gray-400">You owe</p>
                          <p className="text-xl font-bold text-red-600 dark:text-red-400">
                            ₹{Math.abs(netBalance).toFixed(2)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleAddExpense(group)}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                    >
                      Add Expense
                    </button>
                    <button 
                      onClick={() => handleViewDetails(group)}
                      className="w-full px-4 py-2 border border-purple-600 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Group Details Modal */}
      {showDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedGroup.name}
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Expenses Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Expenses ({selectedGroup.expenses?.length || 0})
                </h3>
                <button
                  onClick={() => {
                    setShowDetails(false);
                    handleAddExpense(selectedGroup);
                  }}
                  className="text-sm bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700"
                >
                  + Add
                </button>
              </div>
              {selectedGroup.expenses && selectedGroup.expenses.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroup.expenses.map((expense, idx) => {
                    const userShare = expense.splits?.[user.id] || 0;
                    const paidByName = getUserName(expense.paid_by, selectedGroup);
                    
                    return (
                      <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {expense.description}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {paidByName} paid • {new Date(expense.date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            ₹{expense.total_amount?.toFixed(2)}
                          </p>
                        </div>
                        
                        {/* Show split details */}
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(expense.splits || {}).map(([memberId, amount]) => (
                              <div key={memberId} className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {getUserName(memberId, selectedGroup)}:
                                </span>
                                <span className={`font-semibold ${memberId === user.id ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                                  ₹{amount.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No expenses yet
                </p>
              )}
            </div>

            {/* Balances Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Who Owes Whom
              </h3>
              {selectedGroup.balances && Object.keys(selectedGroup.balances).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(selectedGroup.balances).map(([debtorId, creditors]) => 
                    Object.entries(creditors).map(([creditorId, amount]) => {
                      const debtorName = getUserName(debtorId, selectedGroup);
                      const creditorName = getUserName(creditorId, selectedGroup);
                      const isUserInvolved = debtorId === user.id || creditorId === user.id;
                      
                      return (
                        <div 
                          key={`${debtorId}-${creditorId}`} 
                          className={`flex justify-between items-center p-4 rounded-lg ${
                            isUserInvolved 
                              ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' 
                              : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {debtorName} owes {creditorName}
                            </p>
                            {isUserInvolved && debtorId === user.id && (
                              <button
                                onClick={() => handleSettleUp(debtorId, creditorId, amount, selectedGroup)}
                                className="text-sm text-green-600 dark:text-green-400 hover:underline mt-1"
                              >
                                ✓ Settle Up
                              </button>
                            )}
                          </div>
                          <span className={`font-bold text-lg ${
                            isUserInvolved 
                              ? 'text-orange-600 dark:text-orange-400' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            ₹{amount?.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Check className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
                  <p className="text-green-600 dark:text-green-400 font-semibold">
                    All settled up! 🎉
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense to Group Modal */}
      {showExpenseForm && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Add Expense to {selectedGroup.name}
            </h2>
            
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={expenseFormData.description}
                  onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Dinner at restaurant"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Total Amount *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={expenseFormData.total_amount}
                    onChange={(e) => handleExpenseAmountChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({...expenseFormData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Paid By *
                </label>
                <select
                  value={expenseFormData.paid_by}
                  onChange={(e) => setExpenseFormData({...expenseFormData, paid_by: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value={selectedGroup.owner_id}>
                    {selectedGroup.owner_id === user.id ? `You (${user.name})` : 'Owner'}
                  </option>
                  {selectedGroup.members?.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user_id === user.id ? `You (${member.name})` : member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Split Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={expenseFormData.split_type === 'equal'}
                      onChange={() => handleSplitTypeChange('equal')}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Split Equally</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={expenseFormData.split_type === 'custom'}
                      onChange={() => handleSplitTypeChange('custom')}
                      className="w-4 h-4 text-purple-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Custom Split</span>
                  </label>
                </div>
              </div>


              {/* Split Details */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Split Details:
                </p>
                <div className="space-y-2">
                  {/* Owner */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedGroup.owner_id === user.id ? 'You' : 'Owner'}:
                    </span>
                    {expenseFormData.split_type === 'equal' ? (
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        ₹{(expenseFormData.splits[selectedGroup.owner_id] || 0).toFixed(2)}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.01"
                        value={expenseFormData.splits[selectedGroup.owner_id] || 0}
                        onChange={(e) => handleCustomSplitChange(selectedGroup.owner_id, e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      />
                    )}
                  </div>
                  
                  {/* Members */}
                  {selectedGroup.members?.map(member => (
                    <div key={member.user_id} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">
                        {member.user_id === user.id ? 'You' : member.name}:
                      </span>
                      {expenseFormData.split_type === 'equal' ? (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          ₹{(expenseFormData.splits[member.user_id] || 0).toFixed(2)}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={expenseFormData.splits[member.user_id] || 0}
                          onChange={(e) => handleCustomSplitChange(member.user_id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
                
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={expenseFormData.date}
                  onChange={(e) => setExpenseFormData({...expenseFormData, date: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseForm(false)}
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

      {/* Settle Up Modal */}
      {showSettleForm && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Settle Payment
            </h2>
            
            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{getUserName(settleData.from, selectedGroup)}</span>
                  {' '}is paying{' '}
                  <span className="font-semibold">{getUserName(settleData.to, selectedGroup)}</span>
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  ₹{settleData.amount.toFixed(2)}
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ This will mark the payment as settled. Make sure the actual payment has been made.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSettleForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Group
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Weekend Trip, Office Lunch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Members
                </label>
                
                <div className="space-y-3 mb-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={memberInput.name}
                      onChange={(e) => setMemberInput({...memberInput, name: e.target.value})}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Member name"
                    />
                    <input
                      type="email"
                      value={memberInput.email}
                      onChange={(e) => setMemberInput({...memberInput, email: e.target.value})}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Member email"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:border-purple-500 hover:text-purple-600 transition"
                  >
                    + Add Member
                  </button>
                </div>

                {formData.members.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Members ({formData.members.length}):</p>
                    {formData.members.map((member, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
