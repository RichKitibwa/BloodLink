import axios from 'axios';
import type { User, LoginRequest, RegisterRequest } from '../types/user';

const API_BASE_URL = 'http://localhost:8002/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Other types

export interface BloodOrder {
  id: number;
  blood_type: string;
  component: string;
  units_requested: number;
  priority: string;
  status: string;
  reason?: string;
  created_at: string;
  hospital?: {
    name: string;
  };
}

export interface EmergencyRequest {
  id: number;
  blood_type: string;
  component: string;
  units_needed: number;
  patient_condition: string;
  contact_person: string;
  contact_phone: string;
  response_deadline: string;
  hospital: {
    name: string;
  };
  created_at: string;
}

export interface DashboardData {
  hospital: {
    name: string;
    hospital_code: string;
  };
  pending_orders: number;
  critical_orders: number;
  low_stock_alerts: any[];
  recent_notifications: any[];
}

// API methods
export const authAPI = {
  async login(credentials: LoginRequest) {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await api.post('/auth/token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  async register(userData: RegisterRequest) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async verifyHospitalCode(code: string) {
    const response = await api.post('/users/verify-hospital-code', null, {
      params: { hospital_code: code }
    });
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/users/me');
    return response.data;
  },

  async getDashboard() {
    const response = await api.get('/users/dashboard');
    return response.data;
  },
};

export const ordersAPI = {
  async getOrders(params?: any) {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  async createOrder(orderData: any) {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  async getEmergencies() {
    const response = await api.get('/orders/emergency/active');
    return response.data;
  },

  async createEmergency(emergencyData: any) {
    const response = await api.post('/orders/emergency', emergencyData);
    return response.data;
  },

  async respondToEmergency(requestId: number, responseData: any) {
    const response = await api.post(`/orders/emergency/${requestId}/respond`, responseData);
    return response.data;
  },
};

export interface BloodSearchParams {
  blood_type?: string;
  component?: string;
  region?: string;
  district?: string;
  hospital_name?: string;
  min_units?: number;
  max_distance_km?: number;
  exclude_expired?: boolean;
  exclude_near_expiry?: boolean;
  sort_by?: string;
}

export interface BloodSearchResult {
  stock_id: number;
  blood_type: string;
  component: string;
  units_available: number;
  expiry_date: string;
  days_to_expiry: number;
  donation_date: string;
  batch_number: string;
  source_location?: string;
  availability_status: string;
  hospital_id: number;
  hospital_name: string;
  hospital_code: string;
  hospital_address?: string;
  hospital_district?: string;
  hospital_region?: string;
  hospital_phone?: string;
  hospital_email: string;
  estimated_distance_km?: number;
  is_same_hospital: boolean;
}

export const bloodstockAPI = {
  async getStock(params?: any) {
    const response = await api.get('/bloodstock', { params });
    return response.data;
  },

  async searchBloodStock(params: BloodSearchParams) {
    const response = await api.get('/bloodstock/search', { params });
    return response.data;
  },

  async getNearExpiry(days: number = 7) {
    const response = await api.get('/bloodstock/near-expiry', {
      params: { days }
    });
    return response.data;
  },

  async getStockSummary() {
    const response = await api.get('/bloodstock/summary');
    return response.data;
  },

  async getStockAlerts() {
    const response = await api.get('/bloodstock/alerts');
    return response.data;
  },
};

export default api; 
