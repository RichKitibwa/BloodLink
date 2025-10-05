import React, { useState, useEffect, useRef } from 'react';
import { authAPI, ordersAPI, bloodstockAPI, donationsAPI, requestsAPI } from '../services/api';
import { 
  DropletIcon, 
  AlertTriangle, 
  Clock, 
  Bell,
  TrendingUp,
  Calendar,
  Phone,
  Activity,
  Heart,
  Send,
  Package,
  ChevronLeft,
  ChevronRight,
  Plus,
  Gift
} from 'lucide-react';
import ScheduleDonation from './ScheduleDonation';
import CreateBloodRequest from './CreateBloodRequest';
import AddBloodComponent from './AddBloodComponent';

interface DashboardData {
  hospital: {
    name: string;
    hospital_code: string;
  };
  pending_orders: number;
  critical_orders: number;
  low_stock_alerts: any[];
  recent_notifications: any[];
}

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [availableDonations, setAvailableDonations] = useState<any[]>([]);
  const [incomingDonations, setIncomingDonations] = useState<any[]>([]); // Donations from OTHER hospitals
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleDonation, setShowScheduleDonation] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [showAddBlood, setShowAddBlood] = useState(false);
  
  // Refs for scrolling to cards
  const incomingDonationsRef = useRef<HTMLDivElement>(null);
  const pendingRequestsRef = useRef<HTMLDivElement>(null);
  
  // Pagination state
  const [stockAlertsPage, setStockAlertsPage] = useState(0);
  const [donationsPage, setDonationsPage] = useState(0);
  const [incomingDonationsPage, setIncomingDonationsPage] = useState(0);
  const [requestsPage, setRequestsPage] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dashboard, emergencyData, stockData, incomingDonationsData, requests, myScheduled, criticalUnits] = await Promise.all([
        authAPI.getDashboard(),
        ordersAPI.getEmergencies(),
        bloodstockAPI.getStockAlerts(),
        donationsAPI.getAvailableDonations({ exclude_own_hospital: true }), // Donations FROM other hospitals
        requestsAPI.getPendingRequests(),
        donationsAPI.getMySchedules(), // Get my hospital's scheduled donations
        donationsAPI.getCriticalExpiryUnits() // Get critical units ready for donation
      ]);

      setDashboardData(dashboard);
      setEmergencies(emergencyData);
      setStockAlerts(stockData.alerts || []);
      
      // Incoming donations from OTHER hospitals
      setIncomingDonations(incomingDonationsData || []);
      
      // Combine critical units (not yet scheduled) and already scheduled donations
      const allAvailableForDonation = [
        ...criticalUnits.map((unit: any) => ({
          ...unit,
          is_critical_expiry: true,
          status: 'READY_TO_SCHEDULE',
          blood_type: unit.blood_type,
          component: unit.component,
          units_offered: unit.units_available
        })),
        ...myScheduled.filter((s: any) => s.is_active && s.status === 'AVAILABLE')
      ];
      
      setAvailableDonations(allAvailableForDonation);
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBloodTypeIcon = (_bloodType: string) => {
    return <DropletIcon className="h-4 w-4 text-blood-600" />;
  };

  // Scroll to incoming donations section
  const scrollToIncomingDonations = () => {
    incomingDonationsRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Scroll to pending requests section
  const scrollToPendingRequests = () => {
    pendingRequestsRef.current?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  };

  // Pagination helper component
  const PaginationControls: React.FC<{
    currentPage: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
  }> = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-200">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="flex items-center text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </button>
        <span className="text-sm text-neutral-600">
          Page {currentPage + 1} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="flex items-center text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    );
  };

  // Get paginated data
  const getPaginatedData = (data: any[], page: number) => {
    const startIndex = page * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Emergency Alerts */}
      {emergencies.length > 0 && (
        <div className="bg-blood-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 animate-pulse" />
              <span className="font-medium">EMERGENCY BLOOD REQUESTS</span>
            </div>
            <div className="mt-2 space-y-2">
              {emergencies.slice(0, 3).map((emergency, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span>
                    {emergency.hospital.name} needs {emergency.units_needed} units of {emergency.blood_type}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{emergency.contact_phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div 
            className="card cursor-pointer hover:shadow-lg transition-all hover:scale-105 duration-200"
            onClick={scrollToPendingRequests}
            title="Click to view pending blood requests"
          >
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-600">Pending Orders</p>
                <p className="text-2xl font-bold text-neutral-900 flex items-center">
                  {pendingRequests.length || 0}
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 text-xs text-primary-600 font-normal">
                      ↓ View
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blood-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blood-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-600">Critical Orders</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {dashboardData?.critical_orders || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-600">Stock Alerts</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {stockAlerts.length}
                </p>
              </div>
            </div>
          </div>

          <div 
            className="card cursor-pointer hover:shadow-lg transition-all hover:scale-105 duration-200"
            onClick={scrollToIncomingDonations}
            title="Click to view available donations from other hospitals"
          >
            <div className="flex items-center">
              <div className="p-2 bg-secondary-100 rounded-lg">
                <Gift className="h-6 w-6 text-secondary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-600">Available Donations</p>
                <p className="text-2xl font-bold text-neutral-900 flex items-center">
                  {incomingDonations.length}
                  {incomingDonations.length > 0 && (
                    <span className="ml-2 text-xs text-secondary-600 font-normal">
                      ↓ View
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-600">Active Emergencies</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {emergencies.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Stock Alerts */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <DropletIcon className="h-5 w-5 mr-2 text-blood-600" />
                Stock Alerts
                {stockAlerts.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({stockAlerts.length} total)
                  </span>
                )}
              </h3>
            </div>
            <div className="space-y-3">
              {stockAlerts.length > 0 ? (
                <>
                  {getPaginatedData(stockAlerts, stockAlertsPage).map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getBloodTypeIcon(alert.blood_type)}
                        <div>
                          <p className="font-medium text-neutral-900">
                            {alert.blood_type} {alert.component}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {alert.message}
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                        {alert.severity}
                      </span>
                    </div>
                  ))}
                  <PaginationControls
                    currentPage={stockAlertsPage}
                    totalItems={stockAlerts.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setStockAlertsPage}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <DropletIcon className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>No stock alerts at this time</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setShowAddBlood(true)}
                className="btn btn-primary flex items-center justify-center py-4"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Blood
              </button>
              <button 
                onClick={() => window.location.href = '/search'}
                className="btn btn-secondary flex items-center justify-center py-4"
              >
                <DropletIcon className="h-5 w-5 mr-2" />
                Search Blood
              </button>
              <button 
                onClick={() => setShowCreateRequest(true)}
                className="btn btn-outline flex items-center justify-center py-4"
              >
                <Send className="h-5 w-5 mr-2" />
                Request Blood
              </button>
              <button 
                onClick={() => setShowScheduleDonation(true)}
                className="btn btn-outline flex items-center justify-center py-4"
              >
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Donation
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Grid - New Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Incoming Donations from Other Hospitals */}
          <div className="card" ref={incomingDonationsRef}>
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-secondary-600" />
                Available from Other Hospitals
                {incomingDonations.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({incomingDonations.length} available)
                  </span>
                )}
              </h3>
              <button 
                onClick={() => window.location.href = '/donations'}
                className="text-sm text-secondary-600 hover:text-secondary-700 font-medium cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {incomingDonations.length > 0 ? (
                <>
                  {getPaginatedData(incomingDonations, incomingDonationsPage).map((donation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center space-x-3 flex-1">
                        <DropletIcon className={`h-4 w-4 ${donation.is_critical_expiry ? 'text-yellow-600' : 'text-secondary-600'}`} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-neutral-900">
                              {donation.blood_type} {donation.component}
                            </p>
                            {donation.is_critical_expiry && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                Critical
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600">
                            {donation.units_offered} units • {donation.donating_hospital_name}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {donation.donating_hospital_district && `${donation.donating_hospital_district}, ${donation.donating_hospital_region}`}
                            {donation.estimated_distance_km && ` • ~${donation.estimated_distance_km}km`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.location.href = '/donations'}
                        className="text-xs text-secondary-600 hover:text-secondary-700 font-medium cursor-pointer px-3 py-1 border border-secondary-600 rounded hover:bg-secondary-50 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  ))}
                  <PaginationControls
                    currentPage={incomingDonationsPage}
                    totalItems={incomingDonations.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setIncomingDonationsPage}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Heart className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>No donations available from other hospitals</p>
                  <p className="text-xs mt-2">Check back later for blood units offered by other hospitals</p>
                </div>
              )}
            </div>
          </div>

          {/* Available Donations Card - My Units */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <Heart className="h-5 w-5 mr-2 text-blood-600" />
                My Units Available for Donation
                {availableDonations.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({availableDonations.length} total)
                  </span>
                )}
              </h3>
              <button 
                onClick={() => setShowScheduleDonation(true)}
                className="text-sm text-blood-600 hover:text-blood-700 font-medium cursor-pointer"
              >
                Schedule More
              </button>
            </div>
            <div className="space-y-3">
              {availableDonations.length > 0 ? (
                <>
                  {getPaginatedData(availableDonations, donationsPage).map((donation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DropletIcon className="h-4 w-4 text-blood-600" />
                        <div>
                          <p className="font-medium text-neutral-900">
                            {donation.blood_type} {donation.component}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {donation.units_offered || donation.units_available} units
                            {donation.status === 'READY_TO_SCHEDULE' && (
                              <span className="ml-2 text-xs text-yellow-600 font-medium">• Ready to schedule</span>
                            )}
                          </p>
                          {donation.expiry_date && (
                            <p className="text-xs text-neutral-500">
                              Expires: {new Date(donation.expiry_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        {donation.is_critical_expiry && (
                          <span className="badge badge-critical text-xs">Critical</span>
                        )}
                        {donation.status === 'READY_TO_SCHEDULE' && (
                          <button
                            onClick={() => setShowScheduleDonation(true)}
                            className="text-xs text-blood-600 hover:text-blood-700 font-medium cursor-pointer"
                          >
                            Schedule
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <PaginationControls
                    currentPage={donationsPage}
                    totalItems={availableDonations.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setDonationsPage}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Heart className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>No units ready for donation</p>
                  <button
                    onClick={() => setShowScheduleDonation(true)}
                    className="mt-3 text-sm text-blood-600 hover:text-blood-700 font-medium cursor-pointer"
                  >
                    Schedule Units
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pending Requests Card */}
          <div className="card" ref={pendingRequestsRef}>
            <div className="card-header flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                <Package className="h-5 w-5 mr-2 text-primary-600" />
                Pending Blood Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({pendingRequests.length} total)
                  </span>
                )}
              </h3>
              <button 
                onClick={() => window.location.href = '/requests'}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                <>
                  {getPaginatedData(pendingRequests, requestsPage).map((request, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DropletIcon className="h-4 w-4 text-primary-600" />
                        <div>
                          <p className="font-medium text-neutral-900">
                            {request.blood_type} {request.component}
                          </p>
                          <p className="text-sm text-neutral-600">
                            {request.units_requested} units • {request.requesting_hospital?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`badge ${
                        request.priority === 'very_critical' ? 'badge-critical' :
                        request.priority === 'critical' ? 'badge-warning' :
                        'badge-info'
                      } text-xs`}>
                        {request.priority}
                      </span>
                    </div>
                  ))}
                  <PaginationControls
                    currentPage={requestsPage}
                    totalItems={pendingRequests.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setRequestsPage}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>No pending requests</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-neutral-900 flex items-center">
                Recent Activity
                {dashboardData?.recent_notifications && dashboardData.recent_notifications.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-neutral-500">
                    ({dashboardData.recent_notifications.length} total)
                  </span>
                )}
              </h3>
            </div>
            <div className="space-y-4">
              {dashboardData?.recent_notifications && dashboardData.recent_notifications.length > 0 ? (
                <>
                  {getPaginatedData(dashboardData.recent_notifications, activityPage).map((notification, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-neutral-50 rounded-lg">
                      <div className="p-1 bg-primary-100 rounded-full">
                        <Bell className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-neutral-900">{notification.title}</p>
                        <p className="text-sm text-neutral-600">{notification.message}</p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <PaginationControls
                    currentPage={activityPage}
                    totalItems={dashboardData.recent_notifications.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setActivityPage}
                  />
                </>
              ) : (
                <div className="text-center py-8 text-neutral-500">
                  <Bell className="h-12 w-12 mx-auto mb-3 text-neutral-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {showScheduleDonation && (
        <ScheduleDonation
          onClose={() => setShowScheduleDonation(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}

      {showCreateRequest && (
        <CreateBloodRequest
          onClose={() => setShowCreateRequest(false)}
          onSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}

      {showAddBlood && (
        <AddBloodComponent
          onSuccess={() => {
            setShowAddBlood(false);
            fetchDashboardData(); // Refresh dashboard data after adding blood
          }}
          onCancel={() => setShowAddBlood(false)}
        />
      )}
    </div>
  );
};

export default Dashboard; 
