import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserRole } from '../hooks/useUserRole';
import { 
  submitKreatorApplication, 
  getUserApplication 
} from '../services/kreatorApplicationService';
import { CheckCircle, XCircle, Clock, Send } from 'lucide-react';

export default function ApplyKreator() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isKreator, isAdmin, loading: roleLoading } = useUserRole(currentUser?.uid);

  const [existingApplication, setExistingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    portfolio: '',
    motivation: '',
    experience: '',
  });

  const [errors, setErrors] = useState({});

  // Check if user already has an application
  useEffect(() => {
    if (!currentUser || roleLoading) return;

    // Redirect if already kreator
    if (isKreator || isAdmin) {
      navigate('/kreator-studio');
      return;
    }

    // Fetch existing application
    const fetchApplication = async () => {
      const app = await getUserApplication(currentUser.uid);
      setExistingApplication(app);
      setLoading(false);
    };

    fetchApplication();
  }, [currentUser, isKreator, isAdmin, roleLoading, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.portfolio.trim()) {
      newErrors.portfolio = 'Portfolio URL is required';
    } else if (!isValidUrl(formData.portfolio)) {
      newErrors.portfolio = 'Please enter a valid URL';
    }

    if (!formData.motivation.trim()) {
      newErrors.motivation = 'Motivation is required';
    } else if (formData.motivation.trim().length < 100) {
      newErrors.motivation = 'Please provide at least 100 characters';
    }

    if (!formData.experience.trim()) {
      newErrors.experience = 'Experience description is required';
    } else if (formData.experience.trim().length < 50) {
      newErrors.experience = 'Please provide at least 50 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    const result = await submitKreatorApplication({
      userId: currentUser.uid,
      displayName: currentUser.displayName || 'Anonymous',
      email: currentUser.email,
      ...formData,
    });

    if (result.success) {
      // Refresh application status
      const app = await getUserApplication(currentUser.uid);
      setExistingApplication(app);
      
      // Show success message
      alert('Application submitted successfully! We will review it soon.');
    } else {
      alert(result.message || 'Failed to submit application');
    }

    setSubmitting(false);
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show existing application status
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Kreator Application Status</h1>
            
            <ApplicationStatus application={existingApplication} />

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Your Submission</h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Portfolio</p>
                  <a 
                    href={existingApplication.portfolio} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    {existingApplication.portfolio}
                  </a>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Motivation</p>
                  <p className="text-gray-900">{existingApplication.motivation}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Experience</p>
                  <p className="text-gray-900">{existingApplication.experience}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/home')}
              className="mt-6 w-full py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show application form
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Kreator</h1>
          <p className="text-gray-600 mb-8">
            Join our community of creative frame designers. Share your designs with the world!
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Portfolio URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio URL *
              </label>
              <input
                type="url"
                name="portfolio"
                value={formData.portfolio}
                onChange={handleChange}
                placeholder="https://yourportfolio.com"
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.portfolio ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
              {errors.portfolio && (
                <p className="mt-1 text-sm text-red-600">{errors.portfolio}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Share a link to your design portfolio, Behance, Dribbble, or personal website
              </p>
            </div>

            {/* Motivation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why do you want to become a Kreator? *
              </label>
              <textarea
                name="motivation"
                value={formData.motivation}
                onChange={handleChange}
                rows={5}
                placeholder="Tell us about your passion for design and what motivates you..."
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.motivation ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
              />
              {errors.motivation && (
                <p className="mt-1 text-sm text-red-600">{errors.motivation}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Minimum 100 characters ({formData.motivation.length}/100)
              </p>
            </div>

            {/* Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Design Experience *
              </label>
              <textarea
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your design experience and skills..."
                className={`w-full px-4 py-3 rounded-lg border ${
                  errors.experience ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none`}
              />
              {errors.experience && (
                <p className="mt-1 text-sm text-red-600">{errors.experience}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Minimum 50 characters ({formData.experience.length}/50)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Application
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Application Status Component
function ApplicationStatus({ application }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock size={48} className="text-yellow-500" />,
          title: 'Application Pending',
          message: 'Your application is being reviewed by our team. We will notify you once we make a decision.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
        };
      case 'approved':
        return {
          icon: <CheckCircle size={48} className="text-green-500" />,
          title: 'Application Approved!',
          message: 'Congratulations! You are now a Kreator. You can start creating and publishing frames.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
        };
      case 'rejected':
        return {
          icon: <XCircle size={48} className="text-red-500" />,
          title: 'Application Rejected',
          message: application.rejectionReason || 'Unfortunately, your application was not approved at this time.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig(application.status);

  if (!config) return null;

  return (
    <div className={`${config.bgColor} border-2 ${config.borderColor} rounded-xl p-6 text-center`}>
      <div className="flex justify-center mb-4">
        {config.icon}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{config.title}</h2>
      <p className="text-gray-700">{config.message}</p>
      {application.reviewedAt && (
        <p className="text-sm text-gray-500 mt-3">
          Reviewed on {new Date(application.reviewedAt.seconds * 1000).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
