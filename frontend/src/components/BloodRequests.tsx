import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Building2,
  Calendar,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { requestsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import CreateBloodRequest from './CreateBloodRequest';
import ErrorDialog from './ErrorDialog';
import SuccessDialog from './SuccessDialog';

interface BloodRequest {
  id: number;
  blood_type: string;
  component: string;
  units_requested: number;
  priority: string;
  status: string;
  reason: string | null;
  patient_details: string | null;
  urgency_notes: string | null;
  expected_use_date: string | null;
  created_at: string;
  requesting_hospital: {
    name: string;
    hospital_code: string;
    district: string;
    region: string;
  } | null;
  target_hospital: {
    name: string;
  } | null;
}

const BloodRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseData, setResponseData] = useState({
    units_offered: 1,
    response_message: '',
    estimated_availability: ''
  });
  
  // Dialog states
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '' });
  const [successDialog, setSuccessDialog] = useState({ isOpen: false, message: '' });

  useEffect(() => {
    loadRequests();
  }, [activeTab, filterStatus]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        show_incoming: activeTab === 'incoming',
        show_outgoing: activeTab === 'outgoing'
      };

      if (filterStatus) {
        params.status = filterStatus;
      }

      const data = await requestsAPI.getRequests(params);
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespondToRequest = async (request: BloodRequest) => {
    setSelectedRequest(request);
    setResponseData({
      units_offered: request.units_requested,
      response_message: '',
      estimated_availability: ''
    });
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!selectedRequest) return;

    try {
      await requestsAPI.respondToRequest(selectedRequest.id, responseData);
      setSuccessDialog({ 
        isOpen: true, 
        message: 'Response submitted successfully!' 
      });
      setShowResponseModal(false);
      setSelectedRequest(null);
      loadRequests();
    } catch (error: any) {
      console.error('Error submitting response:', error);
      setErrorDialog({ 
        isOpen: true, 
        message: error.response?.data?.detail || 'Failed to submit response' 
      });
    }
  };

  const handleUpdateStatus = async (requestId: number, status: string) => {
    try {
      await requestsAPI.updateRequest(requestId, { status });
      setSuccessDialog({ 
        isOpen: true, 
        message: `Request ${status} successfully!` 
      });
      loadRequests();
    } catch (error: any) {
      console.error('Error updating request:', error);
      setErrorDialog({ 
        isOpen: true, 
        message: error.response?.data?.detail || 'Failed to update request' 
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'very_critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'critical':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'approved':
        return 'text-green-600';
      case 'fulfilled':
        return 'text-blue-600';
      case 'rejected':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-neutral-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">Blood Requests</h1>
                <p className="text-neutral-600">
                  Manage incoming and outgoing blood requests
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateRequest(true)}
              className="btn btn-primary flex items-center cursor-pointer"
            >
              <Send className="h-4 w-4 mr-2" />
              New Request
            </button>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('incoming')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    activeTab === 'incoming'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  Incoming Requests
                </button>
                <button
                  onClick={() => setActiveTab('outgoing')}
                  className={`px-4 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                    activeTab === 'outgoing'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  My Requests
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="fulfilled">Fulfilled</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={loadRequests}
                  className="btn btn-outline btn-sm flex items-center cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-medium text-neutral-700 mb-2">
              No requests found
            </h3>
            <p className="text-neutral-500 mb-6">
              {activeTab === 'incoming'
                ? "You don't have any incoming blood requests at the moment."
                : "You haven't created any blood requests yet."}
            </p>
            {activeTab === 'outgoing' && (
              <button
                onClick={() => setShowCreateRequest(true)}
                className="btn btn-primary cursor-pointer"
              >
                <Send className="h-4 w-4 mr-2" />
                Create Your First Request
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border divide-y">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center space-x-2 mb-3">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        {request.blood_type} {request.component}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                      <span className={`font-medium ${getStatusColor(request.status)}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                      <div className="space-y-2">
                        <p className="flex items-center text-neutral-600">
                          <Package className="h-4 w-4 mr-2" />
                          <strong className="mr-1">{request.units_requested}</strong> units requested
                        </p>
                        <p className="flex items-center text-neutral-600">
                          <Building2 className="h-4 w-4 mr-2" />
                          {activeTab === 'incoming'
                            ? `From: ${request.requesting_hospital?.name || 'Unknown'}`
                            : request.target_hospital
                            ? `To: ${request.target_hospital.name}`
                            : 'Broadcast to all hospitals'}
                        </p>
                        <p className="flex items-center text-neutral-600">
                          <Clock className="h-4 w-4 mr-2" />
                          {formatDate(request.created_at)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {request.expected_use_date && (
                          <p className="flex items-center text-neutral-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            Needed by: {formatDate(request.expected_use_date)}
                          </p>
                        )}
                        {request.requesting_hospital && (
                          <p className="text-xs text-neutral-500">
                            {request.requesting_hospital.district}, {request.requesting_hospital.region}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    {request.reason && (
                      <div className="bg-neutral-50 rounded p-3 mb-2">
                        <p className="text-sm"><strong>Reason:</strong> {request.reason}</p>
                      </div>
                    )}
                    {request.urgency_notes && (
                      <div className="bg-yellow-50 rounded p-3 mb-2">
                        <p className="text-sm"><strong>Urgency Notes:</strong> {request.urgency_notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    {activeTab === 'incoming' && request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleRespondToRequest(request)}
                          className="btn btn-primary btn-sm flex items-center cursor-pointer"
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Respond
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(request.id, 'rejected')}
                          className="btn btn-outline btn-sm text-red-600 border-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </button>
                      </>
                    )}
                    
                    {activeTab === 'outgoing' && request.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(request.id, 'cancelled')}
                        className="btn btn-outline btn-sm text-red-600 cursor-pointer"
                      >
                        Cancel Request
                      </button>
                    )}
                    
                    {request.status === 'approved' && activeTab === 'outgoing' && (
                      <button
                        onClick={() => handleUpdateStatus(request.id, 'fulfilled')}
                        className="btn btn-primary btn-sm flex items-center cursor-pointer"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Fulfilled
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {showCreateRequest && (
        <CreateBloodRequest
          onClose={() => setShowCreateRequest(false)}
          onSuccess={() => {
            loadRequests();
          }}
        />
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full pointer-events-auto border-2 border-primary-200">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-neutral-900">
                Respond to Blood Request
              </h3>
              <p className="text-sm text-neutral-600">
                {selectedRequest.blood_type} {selectedRequest.component} - {selectedRequest.units_requested} units
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Units You Can Offer
                </label>
                <input
                  type="number"
                  min="1"
                  value={responseData.units_offered}
                  onChange={(e) => setResponseData({ ...responseData, units_offered: parseInt(e.target.value) })}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Estimated Availability
                </label>
                <input
                  type="datetime-local"
                  value={responseData.estimated_availability}
                  onChange={(e) => setResponseData({ ...responseData, estimated_availability: e.target.value })}
                  className="w-full border border-neutral-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={responseData.response_message}
                  onChange={(e) => setResponseData({ ...responseData, response_message: e.target.value })}
                  placeholder="Additional information..."
                  className="w-full border border-neutral-300 rounded-md px-3 py-2"
                />
              </div>
            </div>

            <div className="p-6 border-t flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedRequest(null);
                }}
                className="btn btn-outline cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitResponse}
                className="btn btn-primary cursor-pointer"
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}

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

export default BloodRequests;
