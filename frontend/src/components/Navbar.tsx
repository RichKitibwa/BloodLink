import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Heart, 
  Home,
  Search,
  Building2,
  LogOut,
  Bell,
  User,
  Menu,
  X
} from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: Home,
      showForAll: true
    },
    {
      name: 'Search Blood',
      path: '/search',
      icon: Search,
      showForAll: true
    },
    {
      name: 'Manage Stock',
      path: '/manage-stock',
      icon: Building2,
      showForAll: false,
      roles: ['admin', 'blood_bank_staff']
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  const canShowItem = (item: any) => {
    if (item.showForAll) return true;
    if (item.roles && user) {
      return item.roles.includes(user.role);
    }
    return false;
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="h-10 w-10 bg-gradient-to-r from-blood-500 to-blood-600 rounded-lg flex items-center justify-center">
                <Heart className="h-6 w-6 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-neutral-900">BloodLink</h1>
                <p className="text-xs text-neutral-600 hidden sm:block">
                  {user?.hospital_name || 'Blood Management System'}
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => {
              if (!canShowItem(item)) return null;
              
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blood-100 text-blood-700'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="p-2 text-neutral-400 hover:text-neutral-600 transition-colors">
              <Bell className="h-5 w-5" />
            </button>

            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-neutral-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-neutral-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-neutral-900">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-neutral-500 text-xs capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-neutral-200 py-3">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                if (!canShowItem(item)) return null;
                
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blood-100 text-blood-700'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile User Info */}
            <div className="mt-4 pt-3 border-t border-neutral-200">
              <div className="flex items-center space-x-3 px-3 py-2">
                <div className="h-8 w-8 bg-neutral-200 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-neutral-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-neutral-900">
                    {user?.full_name || user?.username}
                  </p>
                  <p className="text-neutral-500 text-xs capitalize">
                    {user?.role?.replace('_', ' ')} • {user?.hospital_name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
