import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  DropletIcon, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import AddBloodComponent from './AddBloodComponent';

interface BloodStock {
  id: number;
  blood_type: string;
  component: string;
  units_available: number;
  expiry_date: string;
  donation_date: string;
  batch_number: string;
  source_location: string;
  hospital_id?: number;
  is_expired: boolean;
  is_reserved: boolean;
  created_at: string;
  hospital?: {
    name: string;
    hospital_code: string;
  };
}

interface StockSummary {
  blood_type: string;
  component: string;
  total_units: number;
  near_expiry_units: number;
  critical_level: boolean;
}

const BloodStockManagement: React.FC = () => {
  const { user } = useAuth();
  const [bloodStock, setBloodStock] = useState<BloodStock[]>([]);
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchBloodStock();
    fetchStockSummary();
  }, []);

  const fetchBloodStock = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8002/api/bloodstock', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBloodStock(data);
      }
    } catch (error) {
      console.error('Failed to fetch blood stock:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStockSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8002/api/bloodstock/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStockSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch stock summary:', error);
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    fetchBloodStock(); // Refresh the list
    fetchStockSummary(); // Refresh the summary
  };

  const getStatusColor = (stock: BloodStock) => {
    const expiryDate = new Date(stock.expiry_date);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (stock.is_expired || daysToExpiry <= 0) {
      return 'text-red-600 bg-red-100';
    } else if (daysToExpiry <= 7) {
      return 'text-yellow-600 bg-yellow-100';
    } else {
      return 'text-green-600 bg-green-100';
    }
  };

  const getStatusText = (stock: BloodStock) => {
    const expiryDate = new Date(stock.expiry_date);
    const today = new Date();
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (stock.is_expired || daysToExpiry <= 0) {
      return 'Expired';
    } else if (daysToExpiry <= 7) {
      return `Expires in ${daysToExpiry} days`;
    } else {
      return `Expires in ${daysToExpiry} days`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Check if user has permission to manage blood stock
  const canManageStock = user?.role === 'admin' || user?.role === 'blood_bank_staff';

  if (!canManageStock) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Access Denied</h2>
          <p className="text-neutral-600">You don't have permission to manage blood stock.</p>
          <p className="text-sm text-neutral-500 mt-2">Only administrators and blood bank staff can access this section.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Units Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Total Units</p>
                <p className="text-3xl font-bold text-neutral-900">
                  {stockSummary.reduce((sum, item) => sum + item.total_units, 0)}
                </p>
              </div>
              <div className="p-3 bg-blood-100 rounded-lg">
                <DropletIcon className="h-8 w-8 text-blood-600" />
              </div>
            </div>
          </div>

          {/* Blood Types Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Blood Types</p>
                <p className="text-3xl font-bold text-neutral-900">
                  {new Set(stockSummary.map(s => s.blood_type)).size}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
            </div>
          </div>

          {/* Near Expiry Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Near Expiry</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stockSummary.reduce((sum, item) => sum + item.near_expiry_units, 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">Expiring within 7 days</p>
          </div>

          {/* Critical Level Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-600">Critical Level</p>
                <p className="text-3xl font-bold text-red-600">
                  {stockSummary.filter(item => item.critical_level).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">Below minimum threshold</p>
          </div>
        </div>

        {/* Add Blood Stock Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Blood Stock
          </button>
        </div>
        {/* Add Stock Form Modal */}
        {showAddForm && (
          <AddBloodComponent
            onSuccess={handleAddSuccess}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Blood Stock List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-900 flex items-center">
                <DropletIcon className="h-5 w-5 mr-2 text-blood-600" />
                Blood Stock Inventory ({bloodStock.length} items)
              </h2>
              <button
                onClick={fetchBloodStock}
                disabled={isLoading}
                className="btn btn-outline btn-sm flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-neutral-400" />
                <p className="text-neutral-500">Loading blood stock...</p>
              </div>
            ) : bloodStock.length === 0 ? (
              <div className="p-12 text-center">
                <DropletIcon className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                <h3 className="text-lg font-medium text-neutral-700 mb-2">No Blood Stock</h3>
                <p className="text-neutral-500 mb-4">Start by adding blood stock to your inventory.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Stock
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Blood Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Units
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Dates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Batch
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {bloodStock.map((stock) => (
                    <tr key={stock.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blood-100 rounded-lg">
                            <DropletIcon className="h-4 w-4 text-blood-600" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-900">
                              {stock.blood_type}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {stock.component}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-semibold text-neutral-900">
                          {stock.units_available}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600">
                        <div>
                          <p>Donated: {formatDate(stock.donation_date)}</p>
                          <p>Expires: {formatDate(stock.expiry_date)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(stock)}`}>
                          {getStatusText(stock)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className="font-mono text-neutral-900">{stock.batch_number}</p>
                          <p className="text-neutral-500">{stock.source_location}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BloodStockManagement;
