// frontend/src/hooks/useExpenses.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export const useExpenses = () => {
  const { API_URL } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async (params = {}) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/expenses`, { params });
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  return { expenses, loading, fetchExpenses };
};