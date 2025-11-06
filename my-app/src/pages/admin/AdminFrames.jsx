import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isFirebaseConfigured } from '../../config/firebase';
import { FRAME_STATUS } from '../../config/firebaseCollections';
import { 
  FileImage, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye,
  Download,
  Heart,
  Clock,
} from 'lucide-react';

export default function AdminFrames() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [frames, setFrames] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch frames (only if Firebase configured)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setFrames([]);
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 });
      return;
    }
    
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    if (!isFirebaseConfigured) return;
    
    setLoading(true);

    try {
      const {
        getAllFrames,
        getFrameStats,
      } = await import('../../services/frameManagementService');
      
      const statusFilter = filterStatus === 'all' ? null : filterStatus;
      const [framesData, statsData] = await Promise.all([
        getAllFrames(statusFilter),
        getFrameStats(),
      ]);

      setFrames(framesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching frames:', error);
    }
    
    setLoading(false);
  };

  const handleApprove = async (frameId) => {
    if (!isFirebaseConfigured) {
      alert('Firebase not configured. This feature requires Firebase setup.');
      return;
    }
    
    if (!window.confirm('Approve this frame and publish it to the marketplace?')) {
      return;
    }

    setProcessing(true);
    
    try {
      const { approveFrame } = await import('../../services/frameManagementService');
      const result = await approveFrame(frameId, currentUser.uid);

      if (result.success) {
        alert('Frame approved and published!');
        fetchData();
      } else {
        alert(result.message || 'Failed to approve frame');
      }
    } catch (error) {
      console.error('Error approving frame:', error);
      alert('Failed to approve frame');
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    const result = await rejectFrame(selectedFrame.id, currentUser.uid, feedback);

    if (result.success) {
      alert('Frame rejected');
      setShowRejectModal(false);
      setFeedback('');
      setSelectedFrame(null);
      fetchData();
    } else {
      alert(result.message || 'Failed to reject frame');
    }

    setProcessing(false);
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      alert('Please provide feedback for changes');
      return;
    }

    setProcessing(true);
    const result = await requestFrameChanges(selectedFrame.id, currentUser.uid, feedback);

    if (result.success) {
      alert('Change request sent to kreator');
      setShowChangesModal(false);
      setFeedback('');
      setSelectedFrame(null);
      fetchData();
    } else {
      alert(result.message || 'Failed to request changes');
    }

    setProcessing(false);
  };

  const openRejectModal = (frame) => {
    setSelectedFrame(frame);
    setShowRejectModal(true);
  };

  const openChangesModal = (frame) => {
    setSelectedFrame(frame);
    setShowChangesModal(true);
  };

  const closeModals = () => {
    setShowRejectModal(false);
    setShowChangesModal(false);
    setFeedback('');
    setSelectedFrame(null);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading frames...</p>
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
                <p className="text-sm text-yellow-700">
                  Firebase is not configured. Frames list and actions are disabled. 
                  Setup Firebase to enable full functionality.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Frame Management</h1>
          <p className="text-gray-600">Review and manage community frames</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total" value={stats.total} color="bg-blue-500" />
          <StatCard title="Pending" value={stats.pending} color="bg-yellow-500" />
          <StatCard title="Approved" value={stats.approved} color="bg-green-500" />
          <StatCard title="Rejected" value={stats.rejected} color="bg-red-500" />
          <StatCard title="Draft" value={stats.draft} color="bg-gray-500" />
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
            active={filterStatus === FRAME_STATUS.pending_review}
            onClick={() => setFilterStatus(FRAME_STATUS.pending_review)}
            label="Pending Review"
            count={stats.pending}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.approved}
            onClick={() => setFilterStatus(FRAME_STATUS.approved)}
            label="Approved"
            count={stats.approved}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.rejected}
            onClick={() => setFilterStatus(FRAME_STATUS.rejected)}
            label="Rejected"
            count={stats.rejected}
          />
          <FilterButton
            active={filterStatus === FRAME_STATUS.draft}
            onClick={() => setFilterStatus(FRAME_STATUS.draft)}
            label="Draft"
            count={stats.draft}
          />
        </div>

        {/* Frames Grid */}
        {frames.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileImage size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No frames found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {frames.map((frame) => (
              <FrameCard
                key={frame.id}
                frame={frame}
                onApprove={handleApprove}
                onReject={openRejectModal}
                onRequestChanges={openChangesModal}
                processing={processing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <FeedbackModal
          title="Reject Frame"
          frame={selectedFrame}
          feedback={feedback}
          setFeedback={setFeedback}
          onConfirm={handleReject}
          onCancel={closeModals}
          processing={processing}
          buttonLabel="Reject Frame"
          buttonColor="bg-red-600 hover:bg-red-700"
          placeholder="Explain why this frame is being rejected..."
        />
      )}

      {/* Request Changes Modal */}
      {showChangesModal && (
        <FeedbackModal
          title="Request Changes"
          frame={selectedFrame}
          feedback={feedback}
          setFeedback={setFeedback}
          onConfirm={handleRequestChanges}
          onCancel={closeModals}
          processing={processing}
          buttonLabel="Send Feedback"
          buttonColor="bg-orange-600 hover:bg-orange-700"
          placeholder="Describe what changes are needed..."
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className={`${color} text-white p-2 rounded-lg w-10 h-10 flex items-center justify-center mb-2`}>
        <FileImage size={20} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-600">{title}</p>
    </div>
  );
}

// Filter Button
function FilterButton({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        active ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label} ({count})
    </button>
  );
}

// Frame Card Component
function FrameCard({ frame, onApprove, onReject, onRequestChanges, processing }) {
  const getStatusBadge = (status) => {
    const configs = {
      [FRAME_STATUS.draft]: { color: 'bg-gray-100 text-gray-800', label: 'Draft', icon: <Clock size={14} /> },
      [FRAME_STATUS.pending_review]: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: <Clock size={14} /> },
      [FRAME_STATUS.approved]: { color: 'bg-green-100 text-green-800', label: 'Approved', icon: <CheckCircle size={14} /> },
      [FRAME_STATUS.rejected]: { color: 'bg-red-100 text-red-800', label: 'Rejected', icon: <XCircle size={14} /> },
      [FRAME_STATUS.request_changes]: { color: 'bg-orange-100 text-orange-800', label: 'Changes Requested', icon: <AlertCircle size={14} /> },
    };
    const config = configs[status] || configs.draft;
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
    );
  };

  const isPending = frame.status === FRAME_STATUS.pending_review;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex gap-6">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-48 h-48 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg overflow-hidden">
          {frame.thumbnailUrl ? (
            <img src={frame.thumbnailUrl} alt={frame.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FileImage size={48} className="text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{frame.name}</h3>
              <p className="text-gray-600 mb-2">{frame.description || 'No description'}</p>
              <p className="text-sm text-gray-500">
                Created by: <span className="font-medium">{frame.creatorName || 'Unknown'}</span>
              </p>
            </div>
            {getStatusBadge(frame.status)}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mb-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Eye size={16} />
              <span className="text-sm">{frame.views || 0} views</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Download size={16} />
              <span className="text-sm">{frame.uses || 0} uses</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Heart size={16} />
              <span className="text-sm">{frame.likes || 0} likes</span>
            </div>
          </div>

          {/* Actions */}
          {isPending && (
            <div className="flex gap-3">
              <button
                onClick={() => onApprove(frame.id)}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Approve
              </button>
              <button
                onClick={() => onRequestChanges(frame)}
                disabled={processing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <AlertCircle size={18} />
                Request Changes
              </button>
              <button
                onClick={() => onReject(frame)}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={18} />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Feedback Modal Component
function FeedbackModal({ title, frame, feedback, setFeedback, onConfirm, onCancel, processing, buttonLabel, buttonColor, placeholder }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 mb-4">
          Frame: <strong>{frame.name}</strong>
        </p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={processing || !feedback.trim()}
            className={`flex-1 py-2 ${buttonColor} text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {processing ? 'Processing...' : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
