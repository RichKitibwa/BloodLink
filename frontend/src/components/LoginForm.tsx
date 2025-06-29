import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Lock, User, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface LoginFormData {
  username: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.username, data.password);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blood-500 to-blood-600 rounded-full flex items-center justify-center">
            <Heart className="h-8 w-8 text-white fill-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-neutral-900">
            Welcome to BloodLink
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Uganda's Blood Donation Management System
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Sign in to your hospital account
          </p>
        </div>

        <div className="card mt-8 space-y-6">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                <User className="inline h-4 w-4 mr-2" />
                Username or Email
              </label>
              <input
                {...register('username', { 
                  required: 'Username or email is required' 
                })}
                type="text"
                className="form-input"
                placeholder="Enter your username or email"
              />
              {errors.username && (
                <p className="form-error">{errors.username.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <Lock className="inline h-4 w-4 mr-2" />
                Password
              </label>
              <input
                {...register('password', { 
                  required: 'Password is required' 
                })}
                type="password"
                className="form-input"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-neutral-500">New to BloodLink?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full flex justify-center items-center px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors duration-200"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Register your hospital
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} BloodLink Uganda. Saving lives through better blood management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 
