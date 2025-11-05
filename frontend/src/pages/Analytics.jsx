import React from 'react';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Detailed insights into your spending
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <BarChart3 className="w-16 h-16 mx-auto text-purple-600 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Analytics Coming Soon
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Advanced analytics and visualizations will be available here
        </p>
      </div>
    </div>
  );
};

export default Analytics;