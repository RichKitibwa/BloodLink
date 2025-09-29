import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Phone, 
  Mail, 
  Building2, 
  CheckCircle,
  RefreshCw,
  Heart,
  Droplet
} from 'lucide-react';
import { bloodstockAPI } from '../services/api';
import type { BloodSearchParams, BloodSearchResult } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const BloodSearch: React.FC = () => {
  const { } = useAuth(); // Keep for potential future use
  const [searchParams, setSearchParams] = useState<BloodSearchParams>({
    exclude_expired: true,
    exclude_near_expiry: false,
    min_units: 1,
    sort_by: 'distance'
  });
  const [searchResults, setSearchResults] = useState<BloodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Whole Blood', 'Packed Cells', 'Fresh Frozen Plasma', 'Platelets', 'Cryoprecipitate'];
  const regions = ['Central', 'Northern', 'Western', 'Eastern'];

  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const results = await bloodstockAPI.searchBloodStock(searchParams);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
      // You could add a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamChange = (key: keyof BloodSearchParams, value: any) => {
    setSearchParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'text-green-600 bg-green-100';
      case 'Expires Soon':
        return 'text-yellow-600 bg-yellow-100';
      case 'Expired':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            {/* Blood Type */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Blood Type
              </label>
              <select
                value={searchParams.blood_type || ''}
                onChange={(e) => handleParamChange('blood_type', e.target.value || undefined)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              >
                <option value="">All Blood Types</option>
                {bloodTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Component */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Component
              </label>
              <select
                value={searchParams.component || ''}
                onChange={(e) => handleParamChange('component', e.target.value || undefined)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              >
                <option value="">All Components</option>
                {components.map(component => (
                  <option key={component} value={component}>{component}</option>
                ))}
              </select>
            </div>

            {/* Minimum Units */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Min Units
              </label>
              <input
                type="number"
                min="1"
                value={searchParams.min_units || 1}
                onChange={(e) => handleParamChange('min_units', parseInt(e.target.value) || 1)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
              />
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full btn btn-primary flex items-center justify-center"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-neutral-700 mb-3">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Region
                  </label>
                  <select
                    value={searchParams.region || ''}
                    onChange={(e) => handleParamChange('region', e.target.value || undefined)}
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  >
                    <option value="">All Regions</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    value={searchParams.district || ''}
                    onChange={(e) => handleParamChange('district', e.target.value || undefined)}
                    placeholder="Enter district name"
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>

                {/* Hospital Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Hospital Name
                  </label>
                  <input
                    type="text"
                    value={searchParams.hospital_name || ''}
                    onChange={(e) => handleParamChange('hospital_name', e.target.value || undefined)}
                    placeholder="Hospital name"
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>

                {/* Max Distance */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Max Distance (km)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={searchParams.max_distance_km || ''}
                    onChange={(e) => handleParamChange('max_distance_km', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Any distance"
                    className="w-full border border-neutral-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blood-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchParams.exclude_expired || false}
                    onChange={(e) => handleParamChange('exclude_expired', e.target.checked)}
                    className="rounded border-neutral-300 text-blood-600 focus:ring-blood-500"
                  />
                  <span className="ml-2 text-sm text-neutral-700">Exclude expired blood</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={searchParams.exclude_near_expiry || false}
                    onChange={(e) => handleParamChange('exclude_near_expiry', e.target.checked)}
                    className="rounded border-neutral-300 text-blood-600 focus:ring-blood-500"
                  />
                  <span className="ml-2 text-sm text-neutral-700">Exclude expiring soon (3 days)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Search Results */}
        {hasSearched && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Search Results ({searchResults.length} found)
                </h2>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-neutral-600">Sort by:</label>
                  <select
                    value={searchParams.sort_by || 'distance'}
                    onChange={(e) => {
                      handleParamChange('sort_by', e.target.value);
                      handleSearch(); // Re-search with new sort
                    }}
                    className="border border-neutral-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="distance">Distance</option>
                    <option value="expiry_date">Expiry Date</option>
                    <option value="units_available">Units Available</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="divide-y">
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <div key={result.stock_id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-blood-100 rounded-lg">
                          <Droplet className="h-6 w-6 text-blood-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-semibold text-neutral-900">
                              {result.blood_type} {result.component}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getAvailabilityColor(result.availability_status)}`}>
                              {result.availability_status}
                            </span>
                            {result.is_same_hospital && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded-full">
                                Your Hospital
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-600">
                            <div>
                              <p className="flex items-center mb-1">
                                <Building2 className="h-4 w-4 mr-2" />
                                {result.hospital_name} ({result.hospital_code})
                              </p>
                              <p className="flex items-center mb-1">
                                <MapPin className="h-4 w-4 mr-2" />
                                {result.hospital_district}, {result.hospital_region}
                                {result.estimated_distance_km && (
                                  <span className="ml-2 text-xs bg-neutral-100 px-2 py-1 rounded">
                                    ~{result.estimated_distance_km}km
                                  </span>
                                )}
                              </p>
                              <p className="flex items-center mb-1">
                                <Phone className="h-4 w-4 mr-2" />
                                {result.hospital_phone || 'Not provided'}
                              </p>
                              <p className="flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                {result.hospital_email}
                              </p>
                            </div>

                            <div>
                              <p className="flex items-center mb-1">
                                <Heart className="h-4 w-4 mr-2" />
                                <strong>{result.units_available}</strong> units available
                              </p>
                              <p className="flex items-center mb-1">
                                <Clock className="h-4 w-4 mr-2" />
                                Expires: {formatDate(result.expiry_date)} 
                                <span className="ml-2">({result.days_to_expiry} days)</span>
                              </p>
                              <p className="text-xs">
                                Batch: {result.batch_number}
                              </p>
                              {result.source_location && (
                                <p className="text-xs">
                                  Source: {result.source_location}
                                </p>
                              )}
                            </div>
                          </div>

                          {result.hospital_address && (
                            <p className="text-sm text-neutral-500 mt-2">
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {result.hospital_address}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-2">
                        <button className="btn btn-primary btn-sm">
                          Request Blood
                        </button>
                        <button className="btn btn-outline btn-sm">
                          Contact Hospital
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-neutral-500">
                  <Droplet className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
                  <h3 className="text-lg font-medium text-neutral-700 mb-2">No blood stock found</h3>
                  <p>Try adjusting your search criteria or expanding your search area.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial State */}
        {!hasSearched && !isLoading && (
          <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
            <Search className="h-16 w-16 mx-auto mb-4 text-neutral-300" />
            <h3 className="text-lg font-medium text-neutral-700 mb-2">
              Search for Available Blood
            </h3>
            <p className="text-neutral-500 mb-6">
              Enter your search criteria above and click "Search" to find compatible blood matches from hospitals around you.
            </p>
            <div className="flex items-center justify-center space-x-6 text-sm text-neutral-600">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Real-time availability
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                Location-based search
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-orange-500" />
                Expiry tracking
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BloodSearch;
