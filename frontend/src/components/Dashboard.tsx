import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI, ordersAPI, bloodstockAPI } from '../services/api';
import { 
  Heart, 
  DropletIcon, 
  AlertTriangle, 
  Clock, 
  Users, 
  Building2,
  LogOut,
  Bell,
  TrendingUp,
  Calendar,
  Phone,
  Activity
} from 'lucide-react';

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
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashboard, emergencyData, stockData] = await Promise.all([
          authAPI.getDashboard(),
          ordersAPI.getEmergencies(),
          bloodstockAPI.getStockAlerts()
        ]);

        setDashboardData(dashboard);
        setEmergencies(emergencyData);
        setStockAlerts(stockData.alerts || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getBloodTypeIcon = (bloodType: string) => {
    return <DropletIcon className="h-4 w-4 text-blood-600" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'very_critical':
        return 'bg-blood-100 text-blood-800 border-blood-200';
      case 'critical':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-primary-100 text-primary-800 border-primary-200';
    }
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="h-10 w-10 bg-gradient-to-r from-blood-500 to-blood-600 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-white fill-white" />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-semibold text-neutral-900">BloodLink</h1>
                <p className="text-sm text-neutral-600">
                  {dashboardData?.hospital.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-neutral-400" />
                <span className="text-sm text-neutral-600">
                  Welcome, {user?.full_name || user?.username}
                </span>
              </div>
              <button
                onClick={logout}
                className="btn btn-outline text-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Clock className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-neutral-600">Pending Orders</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {dashboardData?.pending_orders || 0}
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

          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-secondary-100 rounded-lg">
                <Activity className="h-6 w-6 text-secondary-600" />
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
              </h3>
            </div>
            <div className="space-y-3">
              {stockAlerts.length > 0 ? (
                stockAlerts.map((alert, index) => (
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
                ))
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
              <button className="btn btn-primary flex items-center justify-center py-4">
                <DropletIcon className="h-5 w-5 mr-2" />
                Request Blood
              </button>
              <button className="btn btn-danger flex items-center justify-center py-4">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Emergency Request
              </button>
              <button className="btn btn-secondary flex items-center justify-center py-4">
                <TrendingUp className="h-5 w-5 mr-2" />
                View Inventory
              </button>
              <button className="btn btn-outline flex items-center justify-center py-4">
                <Calendar className="h-5 w-5 mr-2" />
                Schedule Donation
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-neutral-900">Recent Activity</h3>
            </div>
            <div className="space-y-4">
              {dashboardData?.recent_notifications && dashboardData.recent_notifications.length > 0 ? (
                dashboardData.recent_notifications.map((notification, index) => (
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
                ))
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
    </div>
  );
};

export default Dashboard; 
