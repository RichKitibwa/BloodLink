import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Building2,
  Droplet,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { donationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';

interface DonationWithDetails {
  id: number;
  units_offered: number;
  reason: string | null;
  notes: string | null;
  is_critical_expiry: boolean;
  status: string;
  created_at: string;
  expires_at: string | null;
  blood_type: string;
  component: string;
  expiry_date: string;
  days_to_expiry: number;
  batch_number: string;
  donating_hospital_id: number;
  donating_hospital_name: string;
  donating_hospital_code: string;
  donating_hospital_region: string | null;
  donating_hospital_district: string | null;
  donating_hospital_phone: string | null;
  donating_hospital_email: string;
  estimated_distance_km?: number;
}

const AvailableDonations: React.FC = () => {
  const { } = useAuth();
  const [donations, setDonations] = useState<DonationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBloodType, setSelectedBloodType] = useState<string>('');
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('expiry_date');
  
  // Dialog states
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, message: '' });

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Whole Blood', 'Packed Cells', 'Fresh Frozen Plasma', 'Platelets', 'Cryoprecipitate'];

  useEffect(() => {
    loadDonations();
  }, [selectedBloodType, selectedComponent, sortBy]);

  const loadDonations = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        sort_by: sortBy,
        exclude_own_hospital: true
      };

      if (selectedBloodType) params.blood_type = selectedBloodType;
      if (selectedComponent) params.component = selectedComponent;

      const data = await donationsAPI.getAvailableDonations(params);
      setDonations(data);
    } catch (error) {
      console.error('Error loading donations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptDonation = async (donationId: number) => {
    if (!confirm('Are you sure you want to accept this blood donation? This will transfer the blood units to your hospital.')) {
      return;
    }

    try {
      await donationsAPI.acceptDonation(donationId);
      setSuccessDialog({ 
        isOpen: true, 
        message: 'Donation accepted successfully!' 
      });
      loadDonations(); // Reload the list
    } catch (error: any) {
      console.error('Error accepting donation:', error);
      setErrorDialog({ 
        isOpen: true, 
        message: error.response?.data?.detail || 'Failed to accept donation' 
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getExpiryColor = (days: number) => {
    if (days <= 3) return 'text-red-600';
    if (days <= 7) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blood-100 rounded-lg">
              <Heart className="h-6 w-6 text-blood-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">Available Blood Donations</h1>
              <p className="text-neutral-600">
                Blood units offered by other hospitals for transfer
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Blood Type
              </label>
              <select
                value={selectedBloodType}
                onChange={(e) => setSelectedBloodType(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                {bloodTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Component
              </label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              >
                <option value="">All Components</option>
                {components.map(component => (
                  <option key={component} value={component}>{component}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              >
                <option value="expiry_date">Expiry Date</option>
                <option value="created_at">Recently Added</option>
                <option value="distance">Distance</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={loadDonations}
                className="w-full btn btn-outline flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Donations List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading available donations...</p>
          </div>
        ) : donations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Heart className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-medium text-neutral-700 mb-2">
              No donations available
            </h3>
            <p className="text-neutral-500">
              There are currently no blood units scheduled for donation from other hospitals.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border divide-y">
            {donations.map((donation) => (
              <div key={donation.id} className="p-6 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${donation.is_critical_expiry ? 'bg-yellow-100' : 'bg-blood-100'}`}>
                      <Droplet className={`h-6 w-6 ${donation.is_critical_expiry ? 'text-yellow-600' : 'text-blood-600'}`} />
                    </div>

                    <div className="flex-1">
                      {/* Blood Details */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {donation.blood_type} {donation.component}
                        </h3>
                        {donation.is_critical_expiry && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Critical Expiry
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <p className="flex items-center text-neutral-600">
                            <Heart className="h-4 w-4 mr-2" />
                            <strong className="mr-1">{donation.units_offered}</strong> units available
                          </p>
                          <p className="flex items-center text-neutral-600">
                            <Clock className="h-4 w-4 mr-2" />
                            Expires: {formatDate(donation.expiry_date)}
                            <span className={`ml-2 font-medium ${getExpiryColor(donation.days_to_expiry)}`}>
                              ({donation.days_to_expiry} days)
                            </span>
                          </p>
                          <p className="text-xs text-neutral-500">
                            Batch: {donation.batch_number}
                          </p>
                        </div>

                        {/* Right Column - Hospital Info */}
                        <div className="space-y-2">
                          <p className="flex items-center text-neutral-600">
                            <Building2 className="h-4 w-4 mr-2" />
                            {donation.donating_hospital_name}
                          </p>
                          <p className="flex items-center text-neutral-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            {donation.donating_hospital_district}, {donation.donating_hospital_region}
                            {donation.estimated_distance_km && (
                              <span className="ml-2 text-xs bg-neutral-100 px-2 py-1 rounded">
                                ~{donation.estimated_distance_km}km
                              </span>
                            )}
                          </p>
                          <p className="flex items-center text-neutral-600 text-xs">
                            <Phone className="h-3 w-3 mr-2" />
                            {donation.donating_hospital_phone || 'Not provided'}
                          </p>
                          <p className="flex items-center text-neutral-600 text-xs">
                            <Mail className="h-3 w-3 mr-2" />
                            {donation.donating_hospital_email}
                          </p>
                        </div>
                      </div>

                      {/* Reason and Notes */}
                      {donation.reason && (
                        <div className="bg-neutral-50 rounded p-2 mb-2">
                          <p className="text-sm">
                            <strong>Reason:</strong> {donation.reason}
                          </p>
                        </div>
                      )}
                      {donation.notes && (
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-sm text-neutral-700">
                            <strong>Notes:</strong> {donation.notes}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-neutral-500 mt-2">
                        Listed on: {formatDate(donation.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <button
                      onClick={() => handleAcceptDonation(donation.id)}
                      className="btn btn-primary btn-sm flex items-center cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accept Donation
                    </button>
                    <a
                      href={`mailto:${donation.donating_hospital_email}`}
                      className="btn btn-outline btn-sm flex items-center cursor-pointer"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Contact Hospital
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
        onClose={() => setSuccessDialog({ isOpen: false, message: '' })}
      />
    </div>
  );
};

export default AvailableDonations;
