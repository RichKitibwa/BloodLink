import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Plus,
  Droplet,
  Clock,
  Building2
} from 'lucide-react';
import { donationsAPI, bloodstockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';

interface BloodStock {
  id: number;
  blood_type: string;
  component: string;
  units_available: number;
  expiry_date: string;
  batch_number: string;
  is_expired: boolean;
  is_reserved: boolean;
}

interface ScheduleDonationProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ScheduleDonation: React.FC<ScheduleDonationProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [criticalUnits, setCriticalUnits] = useState<BloodStock[]>([]);
  const [availableUnits, setAvailableUnits] = useState<BloodStock[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAvailable, setShowAvailable] = useState(false);
  
  // Dialog states
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, message: '' });

  const commonReasons = [
    'Critical Expiry',
    'Excess Stock',
    'Emergency Response',
    'Inventory Management',
    'Hospital Transfer',
    'Other (specify below)'
  ];

  useEffect(() => {
    loadBloodUnits();
  }, []);

  const loadBloodUnits = async () => {
    setIsLoading(true);
    try {
      const [critical, available] = await Promise.all([
        donationsAPI.getCriticalExpiryUnits(),
        bloodstockAPI.getStock({ exclude_expired: true, exclude_reserved: true, my_hospital_only: true })
      ]);

      setCriticalUnits(critical);
      
      const nonCriticalUnits = available.filter((unit: BloodStock) => 
        !critical.some((c: BloodStock) => c.id === unit.id)
      );
      setAvailableUnits(nonCriticalUnits);

      // Auto-select all critical units
      const criticalIds = critical.map((unit: BloodStock) => unit.id);
      setSelectedUnits(new Set(criticalIds));
      
      if (criticalIds.length > 0) {
        setReason('Critical Expiry');
      }
    } catch (error) {
      console.error('Error loading blood units:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUnit = (unitId: number) => {
    const newSelected = new Set(selectedUnits);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnits(newSelected);
  };

  const clearAvailableSelections = () => {
    const newSelected = new Set(selectedUnits);
    availableUnits.forEach(unit => {
      newSelected.delete(unit.id);
    });
    setSelectedUnits(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedUnits.size === 0) {
      setErrorDialog({ 
        isOpen: true, 
        message: 'Please select at least one blood unit to schedule for donation' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalReason = reason === 'Other (specify below)' ? customReason : reason;
      
      await donationsAPI.scheduleDonations({
        blood_stock_ids: Array.from(selectedUnits),
        reason: finalReason || undefined,
        notes: notes || undefined
      });

      setSuccessDialog({ 
        isOpen: true, 
        message: `Successfully scheduled ${selectedUnits.size} unit(s) for donation!` 
      });
    } catch (error: any) {
      console.error('Error scheduling donations:', error);
      setErrorDialog({ 
        isOpen: true, 
        message: error.response?.data?.detail || 'Failed to schedule donations' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDaysToExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const renderUnitCard = (unit: BloodStock, isCritical: boolean) => {
    const isSelected = selectedUnits.has(unit.id);
    const daysToExpiry = getDaysToExpiry(unit.expiry_date);

    return (
      <div
        key={unit.id}
        onClick={() => toggleUnit(unit.id)}
        className={`
          p-4 rounded-lg border-2 cursor-pointer transition-all
          ${isSelected 
            ? 'border-blood-500 bg-blood-50' 
            : 'border-neutral-200 hover:border-neutral-300'
          }
          ${isCritical ? 'bg-yellow-50' : ''}
        `}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`
              p-2 rounded-lg
              ${isCritical ? 'bg-yellow-100' : 'bg-blood-100'}
            `}>
              <Droplet className={`h-5 w-5 ${isCritical ? 'text-yellow-600' : 'text-blood-600'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-semibold text-neutral-900">
                  {unit.blood_type} {unit.component}
                </h4>
                {isCritical && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded-full flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Critical
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-600 space-y-1">
                <p className="flex items-center">
                  <strong className="mr-1">{unit.units_available}</strong> units available
                </p>
                <p className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Expires: {formatDate(unit.expiry_date)}
                  <span className={`ml-2 ${daysToExpiry <= 3 ? 'text-red-600 font-medium' : ''}`}>
                    ({daysToExpiry} days)
                  </span>
                </p>
                <p className="text-xs text-neutral-500">
                  Batch: {unit.batch_number}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {isSelected ? (
              <CheckCircle className="h-6 w-6 text-blood-600" />
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-neutral-300" />
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 shadow-2xl pointer-events-auto border-2 border-primary-200">
          <div className="text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p>Loading blood units...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto border-2 border-blood-200">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blood-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blood-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Schedule Blood Donation</h2>
                <p className="text-sm text-neutral-600">
                  {criticalUnits.length > 0 ? (
                    <>
                      <span className="font-semibold text-yellow-700">{criticalUnits.length} critical unit(s)</span> ready for donation
                    </>
                  ) : (
                    'Offer excess or near-expiry blood units to other hospitals'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Banner */}
          {criticalUnits.length > 0 ? (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    <strong>{criticalUnits.length}</strong> critical expiry unit(s) will be automatically scheduled for donation
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    These units are expiring within 5 days. Click "Schedule Donation" to proceed, or select additional units below.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
              <div className="flex items-start">
                <Building2 className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    No critical expiry units at this time
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Select units below to schedule them for donation to other hospitals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Critical Expiry Section */}
          {criticalUnits.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-neutral-900">
                  Critical Expiry Units (Auto-selected)
                </h3>
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full font-semibold">
                  {criticalUnits.length} units
                </span>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                These units are expiring within 5 days and are automatically included for donation.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {criticalUnits.map(unit => renderUnitCard(unit, true))}
              </div>
            </div>
          )}

          {/* Available Units Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Droplet className="h-5 w-5 text-blood-600" />
                <h3 className="text-lg font-semibold text-neutral-900">
                  Additional Available Units
                </h3>
                <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-800 rounded-full font-semibold">
                  {availableUnits.length} units
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {showAvailable && availableUnits.some(unit => selectedUnits.has(unit.id)) && (
                  <button
                    onClick={clearAvailableSelections}
                    className="btn btn-outline text-sm text-red-600 border-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    Clear Selections
                  </button>
                )}
                <button
                  onClick={() => setShowAvailable(!showAvailable)}
                  className="btn btn-outline text-blood-600 border-blood-600 hover:bg-blood-50 cursor-pointer"
                >
                  {showAvailable ? 'Hide' : 'Show'} Available Units
                </button>
              </div>
            </div>
            
            {showAvailable && (
              <>
                <p className="text-sm text-neutral-600 mb-4">
                  Select additional units you want to include in the donation schedule.
                </p>
                {availableUnits.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableUnits.map(unit => renderUnitCard(unit, false))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <Droplet className="h-12 w-12 mx-auto mb-2 text-neutral-300" />
                    <p>No additional units available</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Reason for Donation
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Select a reason</option>
                {commonReasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {reason === 'Other (specify below)' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Custom Reason
                </label>
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter custom reason..."
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any additional information about these units..."
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-neutral-900 font-semibold">
                <strong className="text-blood-600">{selectedUnits.size}</strong> unit(s) selected for donation
              </p>
              {criticalUnits.length > 0 && (
                <p className="text-neutral-600 text-xs mt-1">
                  Includes <strong className="text-yellow-700">{criticalUnits.length}</strong> critical expiry unit(s)
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="btn btn-outline cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary cursor-pointer"
                disabled={isSubmitting || selectedUnits.size === 0}
                title={selectedUnits.size === 0 ? 'Please select at least one unit' : `Schedule ${selectedUnits.size} unit(s) for donation`}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-sm mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule {selectedUnits.size > 0 ? `${selectedUnits.size} ` : ''}Donation{selectedUnits.size > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={errorDialog.isOpen}
        message={errorDialog.message}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
      />

      {/* Success Dialog */}
      <SuccessDialog
        isOpen={successDialog.isOpen}
        message={successDialog.message}
        onClose={() => {
          setSuccessDialog({ isOpen: false, message: '' });
          onSuccess();
          onClose();
        }}
      />
    </div>
  );
};

export default ScheduleDonation;
