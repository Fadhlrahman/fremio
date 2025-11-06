import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isFirebaseConfigured } from '../../config/firebase';
import { 
  Users, 
  FileImage, 
  CheckSquare, 
  Clock, 
  TrendingUp,
  Shield,
  Package,
  Settings,
  AlertCircle,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [stats, setStats] = useState({
    applications: { total: 0, pending: 0, approved: 0, rejected: 0 },
    frames: { total: 0, pending: 0, approved: 0, draft: 0 },
    users: { total: 0, kreators: 0, regular: 0 },
  });
  const [loading, setLoading] = useState(false);

  // Fetch dashboard stats (only if Firebase is configured)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Show demo data in localStorage mode
      setStats({
        applications: { total: 0, pending: 0, approved: 0, rejected: 0 },
        frames: { total: 0, pending: 0, approved: 0, draft: 0 },
        users: { total: 0, kreators: 0, regular: 0 },
      });
      return;
    }
    
    const fetchStats = async () => {
      setLoading(true);
      
      try {
        // Import Firebase services only if configured
        const { getApplicationStats } = await import('../../services/kreatorApplicationService');
        const applicationStats = await getApplicationStats();
        
        // TODO: Fetch frame and user stats when services are implemented
        setStats({
          applications: applicationStats,
          frames: { total: 0, pending: 0, approved: 0, draft: 0 },
          users: { total: 0, kreators: 0, regular: 0 },
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
      
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Firebase Warning Banner */}
        {!isFirebaseConfigured && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                  LocalStorage Mode - UI Preview Only
                </h3>
                <p className="text-sm text-yellow-700 mb-2">
                  Firebase is not configured. You're viewing the admin UI with demo data. 
                  To enable full functionality (data management, approvals, etc.), please setup Firebase.
                </p>
                <p className="text-xs text-yellow-600">
                  📖 See <code className="bg-yellow-100 px-1 py-0.5 rounded">QUICK_START_GUIDE.md</code> for setup instructions
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={32} className="text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Manage your platform, users, and content</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats.users.total}
            subtitle={`${stats.users.kreators} kreators`}
            icon={<Users size={24} />}
            color="bg-blue-500"
            onClick={() => navigate('/admin/users')}
          />
          <StatCard
            title="Total Frames"
            value={stats.frames.total}
            subtitle={`${stats.frames.approved} approved`}
            icon={<FileImage size={24} />}
            color="bg-purple-500"
            onClick={() => navigate('/admin/frames')}
          />
          <StatCard
            title="Pending Reviews"
            value={stats.applications.pending + stats.frames.pending}
            subtitle="Need attention"
            icon={<Clock size={24} />}
            color="bg-yellow-500"
            onClick={() => navigate('/admin/applications')}
          />
          <StatCard
            title="Analytics"
            value="View"
            subtitle="Platform insights"
            icon={<TrendingUp size={24} />}
            color="bg-green-500"
            onClick={() => navigate('/admin/analytics')}
          />
        </div>

        {/* Applications Section */}
        <section className="bg-white rounded-xl shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Kreator Applications</h2>
            <p className="text-gray-600">Review and manage kreator applications</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MiniStatCard
                label="Pending"
                value={stats.applications.pending}
                color="text-yellow-600"
              />
              <MiniStatCard
                label="Approved"
                value={stats.applications.approved}
                color="text-green-600"
              />
              <MiniStatCard
                label="Rejected"
                value={stats.applications.rejected}
                color="text-red-600"
              />
            </div>
            <button
              onClick={() => navigate('/admin/applications')}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Review Applications
            </button>
          </div>
        </section>

        {/* Frames Section */}
        <section className="bg-white rounded-xl shadow mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Frame Management</h2>
            <p className="text-gray-600">Approve and manage community frames</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <MiniStatCard
                label="Pending Review"
                value={stats.frames.pending}
                color="text-yellow-600"
              />
              <MiniStatCard
                label="Approved"
                value={stats.frames.approved}
                color="text-green-600"
              />
              <MiniStatCard
                label="Draft"
                value={stats.frames.draft}
                color="text-gray-600"
              />
            </div>
            <button
              onClick={() => navigate('/admin/frames')}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Manage Frames
            </button>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Quick Actions</h2>
            <p className="text-gray-600">Common administrative tasks</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionButton
              icon={<Users size={20} />}
              label="Manage Users"
              description="View and manage user accounts"
              onClick={() => navigate('/admin/users')}
            />
            <ActionButton
              icon={<CheckSquare size={20} />}
              label="Review Applications"
              description="Approve kreator applications"
              onClick={() => navigate('/admin/applications')}
            />
            <ActionButton
              icon={<FileImage size={20} />}
              label="Approve Frames"
              description="Review frame submissions"
              onClick={() => navigate('/admin/frames')}
            />
            <ActionButton
              icon={<Package size={20} />}
              label="Categories"
              description="Manage frame categories"
              onClick={() => navigate('/admin/categories')}
            />
            <ActionButton
              icon={<TrendingUp size={20} />}
              label="Analytics"
              description="View platform statistics"
              onClick={() => navigate('/admin/analytics')}
            />
            <ActionButton
              icon={<Settings size={20} />}
              label="Settings"
              description="Platform configuration"
              onClick={() => navigate('/admin/settings')}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} text-white p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-1">{value}</h3>
      <p className="text-sm font-medium text-gray-700 mb-1">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}

// Mini Stat Card Component
function MiniStatCard({ label, value, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

// Action Button Component
function ActionButton({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
    >
      <div className="flex-shrink-0 text-purple-600 mt-1">
        {icon}
      </div>
      <div>
        <p className="font-medium text-gray-900 mb-1">{label}</p>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </button>
  );
}
