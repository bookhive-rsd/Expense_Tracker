import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, DollarSign, X } from 'lucide-react';

const Groups = () => {
  const { API_URL, user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    members: []
  });
  const [memberInput, setMemberInput] = useState({
    name: '',
    email: '',
    user_id: ''
  });

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
          user_id: memberInput.user_id || `temp_${Date.now()}`
        }]
      });
      setMemberInput({ name: '', email: '', user_id: '' });
    }
  };

  const handleRemoveMember = (index) => {
    setFormData({
      ...formData,
      members: formData.members.filter((_, i) => i !== index)
    });
  };

  const handleViewDetails = (group) => {
    setSelectedGroup(group);
    setShowDetails(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/groups`, {
        name: formData.name,
        members: formData.members
      });
      
      console.log('Group created:', response.data);
      
      setShowForm(false);
      setFormData({ name: '', members: [] });
      fetchGroups();
      alert('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      const errorMsg = error.response?.data?.detail || error.message;
      alert('Failed to create group: ' + errorMsg);
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
            const memberCount = (group.members?.length || 0) + 1; // +1 for owner
            
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
                  
                  {/* Members List */}
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                      Members
                    </p>
                    <div className="space-y-1">
                      {group.members?.slice(0, 3).map((member, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs font-semibold">
                            {member.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-gray-700 dark:text-gray-300">{member.name}</span>
                        </div>
                      ))}
                      {(group.members?.length || 0) > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          +{group.members.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        ₹{totalExpenses.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
                  <button 
                    onClick={() => handleViewDetails(group)}
                    className="w-full text-purple-600 dark:text-purple-400 text-sm font-medium hover:text-purple-700 dark:hover:text-purple-300"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Group Details Modal */}
      {showDetails && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
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

            {/* Members Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Members ({(selectedGroup.members?.length || 0) + 1})
              </h3>
              <div className="space-y-2">
                {/* Owner */}
                <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedGroup.owner_id === user?.id ? 'You' : 'Owner'} 
                      <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        Owner
                      </span>
                    </p>
                  </div>
                </div>
                
                {/* Members */}
                {selectedGroup.members?.map((member, idx) => (
                  <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                      {member.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Expenses ({selectedGroup.expenses?.length || 0})
              </h3>
              {selectedGroup.expenses && selectedGroup.expenses.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroup.expenses.map((expense, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {expense.description}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(expense.date).toLocaleDateString()} • Split {expense.split_type}
                          </p>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ₹{expense.total_amount?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
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
                Balances
              </h3>
              {selectedGroup.balances && Object.keys(selectedGroup.balances).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(selectedGroup.balances).map(([userId, debts]) => (
                    Object.entries(debts).map(([creditorId, amount]) => (
                      <div key={`${userId}-${creditorId}`} className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                        <span className="text-gray-700 dark:text-gray-300">
                          {userId === user?.id ? 'You owe' : 'Member owes'} {creditorId === user?.id ? 'you' : 'member'}
                        </span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          ₹{amount?.toFixed(2)}
                        </span>
                      </div>
                    ))
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  All settled up! 🎉
                </p>
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
