export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  hospital_id: number | null;
  hospital_name: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
  phone?: string;
  hospital_code: string;
  position?: string;
  role?: string;
} 