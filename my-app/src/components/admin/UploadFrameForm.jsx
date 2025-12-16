import { useState } from 'react';
import './UploadFrameForm.css';

/**
 * Admin Form to Upload FREE or PAID Frames
 * Simple 2-tier system: FREE (accessible to all) vs PAID (subscription required)
 */
export default function UploadFrameForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    layout: 'single',
    is_premium: false,
    display_order: 0,
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setMessage('❌ Please select a frame image');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('frame', file);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('layout', formData.layout);
      formDataToSend.append('is_premium', formData.is_premium);
      formDataToSend.append('display_order', formData.display_order);

      const token = localStorage.getItem('fremio_token');
      const response = await fetch('/api/frames/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ Frame uploaded successfully as ${data.frame.type}`);
        
        // Reset form
        setFormData({
          name: '',
          description: '',
          category: 'general',
          layout: 'single',
          is_premium: false,
          display_order: 0,
        });
        setFile(null);
        setPreview(null);
      } else {
        setMessage(`❌ ${data.error || 'Upload failed'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('❌ Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-frame-form">
      <div className="form-header">
        <h2>📤 Upload Frame</h2>
        <p className="subtitle">Upload FREE or PAID frames for users</p>
      </div>

      {message && (
        <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Frame Preview */}
        {preview && (
          <div className="preview-section">
            <img src={preview} alt="Preview" className="frame-preview" />
          </div>
        )}

        {/* File Upload */}
        <div className="form-group">
          <label htmlFor="frame-file">
            Frame Image <span className="required">*</span>
          </label>
          <input
            type="file"
            id="frame-file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            required
          />
          <small>JPG, PNG, or WebP (max 10MB)</small>
        </div>

        {/* Frame Name */}
        <div className="form-group">
          <label htmlFor="name">
            Frame Name <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="e.g., Wedding Elegance"
            required
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Optional description..."
            rows={3}
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
          >
            <option value="general">General</option>
            <option value="wedding">Wedding</option>
            <option value="birthday">Birthday</option>
            <option value="holiday">Holiday</option>
            <option value="business">Business</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Layout */}
        <div className="form-group">
          <label htmlFor="layout">Layout</label>
          <select
            id="layout"
            name="layout"
            value={formData.layout}
            onChange={handleInputChange}
          >
            <option value="single">Single Photo</option>
            <option value="collage">Collage</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Display Order */}
        <div className="form-group">
          <label htmlFor="display_order">Display Order</label>
          <input
            type="number"
            id="display_order"
            name="display_order"
            value={formData.display_order}
            onChange={handleInputChange}
            min="0"
          />
          <small>Lower numbers appear first (0 = top)</small>
        </div>

        {/* Access Level (FREE vs PAID) */}
        <div className="form-group access-level">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="is_premium"
              checked={formData.is_premium}
              onChange={handleInputChange}
            />
            <span className="checkbox-text">
              <strong>🔒 PAID Frame</strong>
              <br />
              <small>Check this if users need subscription to access this frame</small>
            </span>
          </label>
          
          <div className={`access-indicator ${formData.is_premium ? 'paid' : 'free'}`}>
            {formData.is_premium ? (
              <>
                <span className="icon">🔒</span>
                <span className="label">PAID - Subscription Required</span>
              </>
            ) : (
              <>
                <span className="icon">🎁</span>
                <span className="label">FREE - Accessible to Everyone</span>
              </>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          className="submit-button" 
          disabled={uploading}
        >
          {uploading ? (
            <>
              <span className="spinner"></span>
              Uploading...
            </>
          ) : (
            <>
              <span>📤</span>
              Upload Frame
            </>
          )}
        </button>
      </form>
    </div>
  );
}
