import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  DropletIcon, 
  Save, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface BloodStockForm {
  blood_type: string;
  component: string;
  units_available: number;
  expiry_date: string;
  donation_date: string;
  batch_number: string;
  source_location: string;
}

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

const BloodStockManagement: React.FC = () => {
  const { user } = useAuth();
  const [bloodStock, setBloodStock] = useState<BloodStock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<BloodStockForm>({
    blood_type: '',
    component: '',
    units_available: 1,
    expiry_date: '',
    donation_date: new Date().toISOString().split('T')[0],
    batch_number: '',
    source_location: 'Uganda Blood Transfusion Service'
  });

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Whole Blood', 'Packed Cells', 'Fresh Frozen Plasma', 'Platelets', 'Cryoprecipitate'];

  useEffect(() => {
    fetchBloodStock();
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

  const handleInputChange = (field: keyof BloodStockForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateBatchNumber = () => {
    const prefix = 'BBK'; // Generic prefix for blood bank
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Generate batch number if not provided
      const batchNumber = formData.batch_number || generateBatchNumber();
      
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8002/api/bloodstock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          batch_number: batchNumber,
          expiry_date: new Date(formData.expiry_date).toISOString(),
          donation_date: new Date(formData.donation_date).toISOString(),
        }),
      });

      if (response.ok) {
        const newStock = await response.json();
        setBloodStock(prev => [newStock, ...prev]);
        setShowAddForm(false);
        resetForm();
        alert('Blood stock added successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to add blood stock: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to add blood stock:', error);
      alert('Failed to add blood stock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      blood_type: '',
      component: '',
      units_available: 1,
      expiry_date: '',
      donation_date: new Date().toISOString().split('T')[0],
      batch_number: '',
      source_location: 'Uganda Blood Transfusion Service'
    });
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-neutral-900">Add New Blood Stock</h2>
                <p className="text-sm text-neutral-600 mt-1">Enter blood stock details</p>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Blood Type */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Blood Type *
                    </label>
                    <select
                      value={formData.blood_type}
                      onChange={(e) => handleInputChange('blood_type', e.target.value)}
                      required
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    >
                      <option value="">Select Blood Type</option>
                      {bloodTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Component */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Component *
                    </label>
                    <select
                      value={formData.component}
                      onChange={(e) => handleInputChange('component', e.target.value)}
                      required
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    >
                      <option value="">Select Component</option>
                      {components.map((component) => (
                        <option key={component} value={component}>{component}</option>
                      ))}
                    </select>
                  </div>

                  {/* Units Available */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Units Available *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.units_available}
                      onChange={(e) => handleInputChange('units_available', parseInt(e.target.value) || 1)}
                      required
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                  </div>

                  {/* Donation Date */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Donation Date *
                    </label>
                    <input
                      type="date"
                      value={formData.donation_date}
                      onChange={(e) => handleInputChange('donation_date', e.target.value)}
                      required
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                      required
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                  </div>

                  {/* Batch Number */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Batch Number (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.batch_number}
                      onChange={(e) => handleInputChange('batch_number', e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                    />
                    <p className="text-xs text-neutral-500 mt-1">Leave empty to auto-generate</p>
                  </div>
                </div>

                {/* Source Location */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Source Location
                  </label>
                  <input
                    type="text"
                    value={formData.source_location}
                    onChange={(e) => handleInputChange('source_location', e.target.value)}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      resetForm();
                    }}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn btn-primary flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Add Stock
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
