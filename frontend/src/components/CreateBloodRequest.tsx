import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Building2, 
  AlertCircle,
  Calendar,
  FileText,
  X
} from 'lucide-react';
import { requestsAPI, authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';

interface Hospital {
  id: number;
  name: string;
  hospital_code: string;
  district: string;
  region: string;
}

interface CreateRequestProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBloodRequest: React.FC<CreateRequestProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [formData, setFormData] = useState({
    blood_type: '',
    component: '',
    units_requested: 1,
    priority: 'normal',
    target_hospital_id: '',
    reason: '',
    patient_details: '',
    urgency_notes: '',
    expected_use_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog states
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, message: '' });

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Whole Blood', 'Packed Cells', 'Fresh Frozen Plasma', 'Platelets', 'Cryoprecipitate'];
  const priorities = [
    { value: 'normal', label: 'Normal', color: 'text-primary-600' },
    { value: 'critical', label: 'Critical', color: 'text-yellow-600' },
    { value: 'very_critical', label: 'Very Critical', color: 'text-red-600' }
  ];

  useEffect(() => {
    // In a real app, fetch hospitals from API
    // For now, we'll use placeholder data
    setHospitals([]);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.blood_type || !formData.component) {
      setErrorDialog({ 
        isOpen: true, 
        message: 'Please select blood type and component' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        blood_type: formData.blood_type,
        component: formData.component,
        units_requested: parseInt(formData.units_requested.toString()),
        priority: formData.priority,
        target_hospital_id: formData.target_hospital_id ? parseInt(formData.target_hospital_id) : null,
        reason: formData.reason || undefined,
        patient_details: formData.patient_details || undefined,
        urgency_notes: formData.urgency_notes || undefined,
        expected_use_date: formData.expected_use_date || undefined
      };

      await requestsAPI.createRequest(requestData);
      setSuccessDialog({ 
        isOpen: true, 
        message: 'Blood request submitted successfully!' 
      });
    } catch (error: any) {
      console.error('Error creating request:', error);
      setErrorDialog({ 
        isOpen: true, 
        message: error.response?.data?.detail || 'Failed to create blood request' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto border-2 border-primary-200">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blood-100 rounded-lg">
                <Send className="h-6 w-6 text-blood-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Request Blood</h2>
                <p className="text-sm text-neutral-600">
                  Request blood units from other hospitals
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Blood Type and Component */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Blood Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="blood_type"
                  value={formData.blood_type}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Select Type</option>
                  {bloodTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Component <span className="text-red-500">*</span>
                </label>
                <select
                  name="component"
                  value={formData.component}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">Select Component</option>
                  {components.map(component => (
                    <option key={component} value={component}>{component}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Units and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Units Requested <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="units_requested"
                  value={formData.units_requested}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  required
                  className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
                >
                  {priorities.map(priority => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Hospital */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Target Hospital (Optional)
              </label>
              <select
                name="target_hospital_id"
                value={formData.target_hospital_id}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
              >
                <option value="">Broadcast to all hospitals</option>
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} - {hospital.district}
                  </option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Leave empty to broadcast this request to all hospitals
              </p>
            </div>

            {/* Expected Use Date */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Expected Use Date
              </label>
              <input
                type="datetime-local"
                name="expected_use_date"
                value={formData.expected_use_date}
                onChange={handleChange}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Reason for Request
              </label>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={2}
                placeholder="Brief description of why blood is needed..."
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
              />
            </div>

            {/* Patient Details */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Patient Details (Anonymous)
              </label>
              <textarea
                name="patient_details"
                value={formData.patient_details}
                onChange={handleChange}
                rows={2}
                placeholder="General patient condition (no identifying information)..."
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
              />
            </div>

            {/* Urgency Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Urgency Notes
              </label>
              <textarea
                name="urgency_notes"
                value={formData.urgency_notes}
                onChange={handleChange}
                rows={2}
                placeholder="Any additional urgency or special requirements..."
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent cursor-pointer"
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t bg-neutral-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-600">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              All requests are tracked and can be viewed in your orders
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-outline cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="spinner-sm mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Request
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

export default CreateBloodRequest;
