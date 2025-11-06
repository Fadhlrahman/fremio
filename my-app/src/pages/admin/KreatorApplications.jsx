import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isFirebaseConfigured } from '../../config/firebase';
import { APPLICATION_STATUS } from '../../config/firebaseCollections';
import { CheckCircle, XCircle, Clock, ExternalLink, AlertCircle } from 'lucide-react';

export default function KreatorApplications() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch applications (only if Firebase configured)
  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Show empty state in localStorage mode
      setApplications([]);
      setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      return;
    }
    
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    if (!isFirebaseConfigured) return;
    
    setLoading(true);
    
    try {
      const {
        getAllApplications,
        getApplicationStats,
      } = await import('../../services/kreatorApplicationService');
      
      const statusFilter = filterStatus === 'all' ? null : filterStatus;
      const [appsData, statsData] = await Promise.all([
        getAllApplications(statusFilter),
        getApplicationStats(),
      ]);
      
      setApplications(appsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
    
    setLoading(false);
  };

  const handleApprove = async (applicationId) => {
    if (!isFirebaseConfigured) {
      alert('Firebase not configured. This feature requires Firebase setup.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to approve this application? The user will be promoted to Kreator.')) {
      return;
    }

    setProcessing(true);
    
    try {
      const { approveApplication } = await import('../../services/kreatorApplicationService');
      const result = await approveApplication(applicationId, currentUser.uid);
    
      if (result.success) {
        alert('Application approved successfully!');
        fetchData(); // Refresh data
      } else {
        alert(result.message || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      alert('Failed to approve application');
    }
    
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!isFirebaseConfigured) {
      alert('Firebase not configured. This feature requires Firebase setup.');
      return;
    }
    
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    
    try {
      const { rejectApplication } = await import('../../services/kreatorApplicationService');
      const result = await rejectApplication(selectedApp.id, currentUser.uid, rejectionReason);
      
      if (result.success) {
        alert('Application rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedApp(null);
        fetchData(); // Refresh data
      } else {
        alert(result.message || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Failed to reject application');
    }
    
    setProcessing(false);
  };

  const openRejectModal = (app) => {
    setSelectedApp(app);
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedApp(null);
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
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
                  Firebase is not configured. Applications list and actions are disabled. 
                  Setup Firebase to enable full functionality.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kreator Applications</h1>
          <p className="text-gray-600">Review and manage kreator applications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total"
            value={stats.total}
            icon={<Clock size={24} />}
            color="bg-blue-500"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<Clock size={24} />}
            color="bg-yellow-500"
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={<CheckCircle size={24} />}
            color="bg-green-500"
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={<XCircle size={24} />}
            color="bg-red-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow p-2 mb-6 flex gap-2">
          <FilterButton
            active={filterStatus === 'all'}
            onClick={() => setFilterStatus('all')}
            label="All"
            count={stats.total}
          />
          <FilterButton
            active={filterStatus === APPLICATION_STATUS.pending}
            onClick={() => setFilterStatus(APPLICATION_STATUS.pending)}
            label="Pending"
            count={stats.pending}
          />
          <FilterButton
            active={filterStatus === APPLICATION_STATUS.approved}
            onClick={() => setFilterStatus(APPLICATION_STATUS.approved)}
            label="Approved"
            count={stats.approved}
          />
          <FilterButton
            active={filterStatus === APPLICATION_STATUS.rejected}
            onClick={() => setFilterStatus(APPLICATION_STATUS.rejected)}
            label="Rejected"
            count={stats.rejected}
          />
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No applications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onApprove={handleApprove}
                onReject={openRejectModal}
                processing={processing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          application={selectedApp}
          reason={rejectionReason}
          setReason={setRejectionReason}
          onConfirm={handleReject}
          onCancel={closeRejectModal}
          processing={processing}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} text-white p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
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

// Application Card Component
function ApplicationCard({ application, onApprove, onReject, processing }) {
  const getStatusBadge = (status) => {
    const configs = {
      [APPLICATION_STATUS.pending]: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        label: 'Pending Review',
      },
      [APPLICATION_STATUS.approved]: {
        color: 'bg-green-100 text-green-800 border-green-200',
        label: 'Approved',
      },
      [APPLICATION_STATUS.rejected]: {
        color: 'bg-red-100 text-red-800 border-red-200',
        label: 'Rejected',
      },
    };
    
    const config = configs[status] || configs.pending;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const isPending = application.status === APPLICATION_STATUS.pending;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{application.displayName}</h3>
          <p className="text-gray-600">{application.email}</p>
          <p className="text-sm text-gray-500 mt-1">
            Submitted: {new Date(application.submittedAt?.seconds * 1000).toLocaleDateString()}
          </p>
        </div>
        {getStatusBadge(application.status)}
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Portfolio</p>
          <a
            href={application.portfolio}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 hover:underline flex items-center gap-1"
          >
            {application.portfolio}
            <ExternalLink size={14} />
          </a>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Motivation</p>
          <p className="text-gray-900">{application.motivation}</p>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Experience</p>
          <p className="text-gray-900">{application.experience}</p>
        </div>

        {application.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 mb-1">Rejection Reason</p>
            <p className="text-red-700">{application.rejectionReason}</p>
          </div>
        )}
      </div>

      {isPending && (
        <div className="flex gap-3">
          <button
            onClick={() => onApprove(application.id)}
            disabled={processing}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            Approve
          </button>
          <button
            onClick={() => onReject(application)}
            disabled={processing}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <XCircle size={18} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// Reject Modal Component
function RejectModal({ application, reason, setReason, onConfirm, onCancel, processing }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Application</h3>
        
        <p className="text-gray-600 mb-4">
          Rejecting application from <strong>{application.displayName}</strong>
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rejection Reason *
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Provide a reason for rejection..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
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
            disabled={processing || !reason.trim()}
            className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}
