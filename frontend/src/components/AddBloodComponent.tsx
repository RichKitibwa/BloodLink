import React, { useState } from 'react';
import { Plus, X, Save, AlertCircle } from 'lucide-react';
import SuccessDialog from './SuccessDialog';
import ErrorDialog from './ErrorDialog';
import { bloodstockAPI } from '../services/api';

interface AddBloodComponentProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface BloodStockForm {
  blood_type: string;
  component: string;
  units_available: number;
  expiry_date: string;
  donation_date: string;
  batch_number: string;
  source_location: string;
}

const AddBloodComponent: React.FC<AddBloodComponentProps> = ({ onSuccess, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState<BloodStockForm>({
    blood_type: '',
    component: '',
    units_available: 1,
    expiry_date: '',
    donation_date: new Date().toISOString().split('T')[0],
    batch_number: '',
    source_location: ''
  });

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Whole Blood', 'Packed Cells', 'Fresh Frozen Plasma', 'Platelets', 'Cryoprecipitate'];

  const handleInputChange = (field: keyof BloodStockForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateBatchNumber = () => {
    const prefix = 'BLK'; // BloodLink prefix
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${date}-${random}`;
  };

  const validateForm = () => {
    if (!formData.blood_type) {
      setErrorMessage('Please select a blood type');
      return false;
    }
    if (!formData.component) {
      setErrorMessage('Please select a blood component');
      return false;
    }
    if (formData.units_available < 1) {
      setErrorMessage('Units available must be at least 1');
      return false;
    }
    if (!formData.donation_date) {
      setErrorMessage('Please select a donation date');
      return false;
    }
    if (!formData.expiry_date) {
      setErrorMessage('Please select an expiry date');
      return false;
    }
    
    // Check if expiry date is after donation date
    const donationDate = new Date(formData.donation_date);
    const expiryDate = new Date(formData.expiry_date);
    
    if (expiryDate <= donationDate) {
      setErrorMessage('Expiry date must be after donation date');
      return false;
    }

    // Warning if expiry date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiryDate <= today) {
      setErrorMessage('Warning: Expiry date is in the past. This blood will be marked as expired.');
      // Allow submission but show warning
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setShowError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate batch number if not provided
      const batchNumber = formData.batch_number.trim() || generateBatchNumber();
      
      // Use the API function
      await bloodstockAPI.addStock({
        blood_type: formData.blood_type,
        component: formData.component,
        units_available: formData.units_available,
        batch_number: batchNumber,
        source_location: formData.source_location || 'Blood Bank',
        expiry_date: new Date(formData.expiry_date).toISOString(),
        donation_date: new Date(formData.donation_date).toISOString(),
      });

      setShowSuccess(true);
      // Reset form after short delay
      setTimeout(() => {
        setShowSuccess(false);
        onSuccess();
      }, 2000);
    } catch (error: any) {
      console.error('Failed to add blood component:', error);
      const errorMsg = error?.response?.data?.detail || 
                       error?.message || 
                       'Failed to add blood component. Please try again.';
      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate suggested expiry date based on component type
  const getSuggestedExpiryDate = (component: string, donationDate: string) => {
    if (!donationDate) return '';
    
    const donation = new Date(donationDate);
    let daysToAdd = 35; // Default for whole blood
    
    switch (component) {
      case 'Whole Blood':
        daysToAdd = 35;
        break;
      case 'Packed Cells':
        daysToAdd = 42;
        break;
      case 'Fresh Frozen Plasma':
        daysToAdd = 365;
        break;
      case 'Platelets':
        daysToAdd = 5;
        break;
      case 'Cryoprecipitate':
        daysToAdd = 365;
        break;
    }
    
    donation.setDate(donation.getDate() + daysToAdd);
    return donation.toISOString().split('T')[0];
  };

  // Auto-calculate expiry date when component or donation date changes
  React.useEffect(() => {
    if (formData.component && formData.donation_date && !formData.expiry_date) {
      const suggestedExpiry = getSuggestedExpiryDate(formData.component, formData.donation_date);
      setFormData(prev => ({ ...prev, expiry_date: suggestedExpiry }));
    }
  }, [formData.component, formData.donation_date]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 flex items-center">
                <Plus className="h-5 w-5 mr-2 text-blood-600" />
                Add New Blood Component
              </h2>
              <p className="text-sm text-neutral-600 mt-1">Add blood stock to your inventory</p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Blood Type and Component */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blood Type */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Blood Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.blood_type}
                  onChange={(e) => handleInputChange('blood_type', e.target.value)}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
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
                  Blood Component <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.component}
                  onChange={(e) => handleInputChange('component', e.target.value)}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
                >
                  <option value="">Select Component</option>
                  {components.map((component) => (
                    <option key={component} value={component}>{component}</option>
                  ))}
                </select>
                {formData.component && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Typical shelf life: {
                      formData.component === 'Whole Blood' ? '35 days' :
                      formData.component === 'Packed Cells' ? '42 days' :
                      formData.component === 'Platelets' ? '5 days' :
                      formData.component === 'Fresh Frozen Plasma' ? '1 year' :
                      formData.component === 'Cryoprecipitate' ? '1 year' : ''
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Units Available */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Units Available <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.units_available}
                onChange={(e) => handleInputChange('units_available', parseInt(e.target.value) || 1)}
                required
                className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
                placeholder="Enter number of units"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Number of blood units to add to inventory
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Donation Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Donation Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.donation_date}
                  onChange={(e) => handleInputChange('donation_date', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Expiry Date */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Expiry Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                  min={formData.donation_date}
                  required
                  className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  Auto-calculated based on component type
                </p>
              </div>
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Batch Number (Optional)
              </label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => handleInputChange('batch_number', e.target.value)}
                placeholder="Leave empty to auto-generate"
                className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-neutral-500 mt-1">
                A unique batch number will be generated automatically if left empty
              </p>
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
                placeholder="e.g., Regional Blood Bank, Mobile Collection Center"
                className="w-full border border-neutral-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blood-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Where the blood was collected or sourced from
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Important Information</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Ensure all blood units have been properly tested and screened</li>
                    <li>Double-check expiry dates to ensure accuracy</li>
                    <li>Blood that has already expired will be automatically flagged</li>
                    <li>All dates and times are recorded in your local timezone</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-6 py-2.5 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-blood-600 text-white rounded-lg hover:bg-blood-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Blood Component
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Blood Component Added"
        message="The blood component has been successfully added to your inventory."
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={showError}
        onClose={() => setShowError(false)}
        title="Error Adding Blood Component"
        message={errorMessage}
      />
    </>
  );
};

export default AddBloodComponent;
