import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Building2, User, Mail, Lock, Phone, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterFormData {
  hospital_code: string;
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  full_name: string;
  phone: string;
  position: string;
  role: string;
}

const RegisterForm: React.FC = () => {
  const { register: registerUser, verifyHospitalCode } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const verifyHospital = async (code: string) => {
    if (!code) return;
    
    setIsLoading(true);
    try {
      const response = await verifyHospitalCode(code);
      setHospitalInfo(response);
      setStep(2);
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    if (step === 1) {
      await verifyHospital(data.hospital_code);
      return;
    }

    if (data.password !== data.confirm_password) {
      return;
    }

    setIsLoading(true);
    try {
      await registerUser({
        ...data,
        role: data.role || 'hospital_staff'
      });
      navigate('/login');
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
            Join BloodLink
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Register your hospital for blood management
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 1 ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300'
              }`}>
                {step > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
            </div>
                            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                step >= 2 ? 'border-primary-600 bg-primary-600 text-white' : 'border-neutral-300'
              }`}>
                2
              </div>
            </div>
          </div>
        </div>

        <div className="card space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <>
                <div className="text-center">
                  <Building2 className="mx-auto h-12 w-12 text-primary-600" />
                  <h3 className="mt-2 text-lg font-medium text-neutral-900">
                    Hospital Verification
                  </h3>
                  <p className="text-sm text-neutral-600">
                    Enter your hospital code to verify eligibility
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="hospital_code" className="form-label">
                    Hospital Code
                  </label>
                  <input
                    {...register('hospital_code', { 
                      required: 'Hospital code is required',
                      pattern: {
                        value: /^[A-Z]{2,}[A-Z0-9]{4,}$/,
                        message: 'Invalid hospital code format'
                      }
                    })}
                    type="text"
                    className="form-input uppercase"
                    placeholder="e.g., GMUL2024"
                    style={{ textTransform: 'uppercase' }}
                  />
                  {errors.hospital_code && (
                    <p className="form-error">{errors.hospital_code.message}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    G = Government, P = Private, N = Non-profit
                  </p>
                </div>
              </>
            )}

            {step === 2 && hospitalInfo && (
              <>
                <div className="text-center p-4 bg-secondary-50 rounded-lg">
                  <CheckCircle className="mx-auto h-8 w-8 text-secondary-600" />
                  <h3 className="mt-2 text-lg font-medium text-neutral-900">
                    {hospitalInfo.hospital_name}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {hospitalInfo.hospital_type} Hospital
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="form-group">
                    <label htmlFor="full_name" className="form-label">
                      <User className="inline h-4 w-4 mr-2" />
                      Full Name
                    </label>
                    <input
                      {...register('full_name', { required: 'Full name is required' })}
                      type="text"
                      className="form-input"
                      placeholder="Enter your full name"
                    />
                    {errors.full_name && (
                      <p className="form-error">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email Address
                    </label>
                    <input
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      type="email"
                      className="form-input"
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="form-error">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="username" className="form-label">
                        Username
                      </label>
                      <input
                        {...register('username', { 
                          required: 'Username is required',
                          minLength: {
                            value: 3,
                            message: 'Username must be at least 3 characters'
                          }
                        })}
                        type="text"
                        className="form-input"
                        placeholder="Choose username"
                      />
                      {errors.username && (
                        <p className="form-error">{errors.username.message}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone" className="form-label">
                        <Phone className="inline h-4 w-4 mr-2" />
                        Phone Number
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        className="form-input"
                        placeholder="+256..."
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="position" className="form-label">
                      <Briefcase className="inline h-4 w-4 mr-2" />
                      Position in Hospital
                    </label>
                    <input
                      {...register('position')}
                      type="text"
                      className="form-input"
                      placeholder="e.g., Blood Bank Manager, Lab Technician"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="role" className="form-label">
                      Role
                    </label>
                    <select
                      {...register('role')}
                      className="form-input"
                    >
                      <option value="hospital_staff">Hospital Staff</option>
                      <option value="blood_bank_staff">Blood Bank Staff</option>
                      <option value="viewer">Viewer Only</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-group">
                      <label htmlFor="password" className="form-label">
                        <Lock className="inline h-4 w-4 mr-2" />
                        Password
                      </label>
                      <input
                        {...register('password', { 
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                          }
                        })}
                        type="password"
                        className="form-input"
                        placeholder="Create password"
                      />
                      {errors.password && (
                        <p className="form-error">{errors.password.message}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirm_password" className="form-label">
                        Confirm Password
                      </label>
                      <input
                        {...register('confirm_password', { 
                          required: 'Please confirm your password',
                          validate: value => value === password || 'Passwords do not match'
                        })}
                        type="password"
                        className="form-input"
                        placeholder="Confirm password"
                      />
                      {errors.confirm_password && (
                        <p className="form-error">{errors.confirm_password.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn btn-outline"
                >
                  Back
                </button>
              )}
              
              <button
                type="submit"
                disabled={isLoading}
                className={`btn btn-primary ${step === 1 ? 'w-full' : 'ml-auto'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    {step === 1 ? 'Verifying...' : 'Creating Account...'}
                  </div>
                ) : (
                  step === 1 ? 'Verify Hospital' : 'Create Account'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm; 
