import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCanCreateFrames } from '../hooks/useUserRole';
import { getKreatorFrames, getFrameStats } from '../services/frameManagementService';
import { FRAME_STATUS } from '../config/firebaseCollections';
import { 
  Plus, 
  FileImage, 
  Eye, 
  Download, 
  Heart,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export default function KreatorStudio() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { canCreateFrames, loading: roleLoading } = useCanCreateFrames(currentUser?.uid);

  const [frames, setFrames] = useState([]);
  const [stats, setStats] = useState({ total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  // Redirect if not kreator/admin
  useEffect(() => {
    if (!roleLoading && !canCreateFrames) {
      navigate('/apply-kreator');
    }
  }, [canCreateFrames, roleLoading, navigate]);

  // Fetch frames and stats
  useEffect(() => {
    if (!currentUser) return;
    fetchData();
  }, [currentUser, filterStatus]);

  const fetchData = async () => {
    setLoading(true);

    const statusFilter = filterStatus === 'all' ? null : filterStatus;
    const [framesData, statsData] = await Promise.all([
      getKreatorFrames(currentUser.uid, statusFilter),
      getFrameStats(currentUser.uid),
    ]);

    setFrames(framesData);
    setStats(statsData);
    setLoading(false);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kreator Studio</h1>
            <p className="text-gray-600">Create and manage your frame designs</p>
          </div>
          <button
            onClick={() => navigate('/frame-builder')}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
          >
            <Plus size={20} />
            Create New Frame
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard
            label="Total Frames"
            value={stats.total}
            icon={<FileImage size={20} />}
            color="bg-blue-500"
          />
          <StatCard
            label="Draft"
            value={stats.draft}
            icon={<Clock size={20} />}
            color="bg-gray-500"
          />
          <StatCard
            label="Pending Review"
            value={stats.pending}
            icon={<Clock size={20} />}
            color="bg-yellow-500"
          />
          <StatCard
            label="Approved"
            value={stats.approved}
            icon={<CheckCircle size={20} />}
            color="bg-green-500"
          />
          <StatCard
            label="Rejected"
            value={stats.rejected}
            icon={<XCircle size={20} />}
            color="bg-red-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-2 mb-6 flex flex-wrap gap-2">
          <FilterButton
            active={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
            label="All"
            count={stats.total}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.draft}
            onClick={() => setFilterStatus(FRAME_STATUS.draft)}
            label="Draft"
            count={stats.draft}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.pending_review}
            onClick={() => setFilterStatus(FRAME_STATUS.pending_review)}
            label="Pending"
            count={stats.pending}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.approved}
            onClick={() => setFilterStatus(FRAME_STATUS.approved)}
            label="Approved"
            count={stats.approved}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.request_changes}
            onClick={() => setFilterStatus(FRAME_STATUS.request_changes)}
            label="Changes Requested"
            count={stats.requestChanges || 0}
          />
        </div>

        {/* Frames Grid */}
        {frames.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileImage size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filterStatus === 'all' ? 'No frames yet' : `No ${filterStatus} frames`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === 'all' 
                ? 'Start creating beautiful frame designs for the community'
                : 'No frames match this filter'}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={() => navigate('/frame-builder')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Create Your First Frame
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {frames.map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                onEdit={() => navigate(`/frame-builder/${frame.id}`)}
                onRefresh={fetchData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className={`${color} text-white p-2 rounded-lg w-fit mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

// Filter Button Component
function FilterButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label} <span className="ml-1">({count})</span>
    </button>
  );
}

// Frame Card Component
function FrameCard({ frame, onEdit, onRefresh }) {
  const getStatusBadge = (status) => {
    const configs = {
      [FRAME_STATUS.draft]: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        label: 'Draft',
        icon: <Clock size={14} />,
      },
      [FRAME_STATUS.pending_review]: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Pending Review',
        icon: <Clock size={14} />,
      },
      [FRAME_STATUS.approved]: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Approved',
        icon: <CheckCircle size={14} />,
      },
      [FRAME_STATUS.rejected]: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Rejected',
        icon: <XCircle size={14} />,
      },
      [FRAME_STATUS.request_changes]: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        label: 'Changes Requested',
        icon: <AlertCircle size={14} />,
      },
    };

    const config = configs[status] || configs.draft;

    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-xl transition-shadow overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-blue-100">
        {frame.thumbnailUrl ? (
          <img 
            src={frame.thumbnailUrl} 
            alt={frame.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <FileImage size={48} className="text-gray-400" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          {getStatusBadge(frame.status)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{frame.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {frame.description || 'No description'}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="bg-gray-50 rounded p-2">
            <Eye size={16} className="text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">{frame.views || 0}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <Download size={16} className="text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">{frame.uses || 0}</p>
          </div>
          <div className="bg-gray-50 rounded p-2">
            <Heart size={16} className="text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">{frame.likes || 0}</p>
          </div>
        </div>

        {/* Feedback if any */}
        {frame.changeRequestFeedback && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-orange-800 mb-1">Feedback from admin:</p>
            <p className="text-xs text-orange-700">{frame.changeRequestFeedback}</p>
          </div>
        )}

        {frame.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-red-800 mb-1">Rejection reason:</p>
            <p className="text-xs text-red-700">{frame.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <button
          onClick={onEdit}
          className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          {frame.status === FRAME_STATUS.draft || frame.status === FRAME_STATUS.request_changes
            ? 'Edit Frame'
            : 'View Details'}
        </button>
      </div>
    </div>
  );
}
