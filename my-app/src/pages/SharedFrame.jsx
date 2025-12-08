import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import draftService from '../services/draftService';
import frameProvider from '../utils/frameProvider';
import { useToast } from '../contexts/ToastContext';
import './SharedFrame.css';

// CRITICAL: Use temporary sessionStorage for shared frames to avoid conflicts
// with user's personal drafts stored in localStorage with userStorage prefix
const SHARED_FRAME_KEY = '__fremio_shared_frame_temp__';

export default function SharedFrame() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSharedFrame = async () => {
      try {
        console.log('🔗 [SharedFrame] Loading shared frame:', shareId);
        
        // Fetch frame dari server
        const draft = await draftService.getSharedDraft(shareId);
        
        if (!draft || !draft.frame_data) {
          throw new Error('Frame data not found');
        }

        console.log('✅ [SharedFrame] Draft loaded:', {
          id: draft.id,
          title: draft.title,
          shareId: draft.share_id
        });

        // Parse frame_data jika string
        const frameData = typeof draft.frame_data === 'string' 
          ? JSON.parse(draft.frame_data) 
          : draft.frame_data;

        console.log('📦 [SharedFrame] Frame data:', {
          aspectRatio: frameData.aspectRatio,
          elementsCount: frameData.elements?.length,
          hasPhotoSlots: !!frameData.photoSlots
        });

        // Convert ke frame config untuk TakeMoment AND EditPhoto
        const photoElements = frameData.elements?.filter(el => el.type === 'photo') || [];
        
        // CRITICAL: Canvas dimensions for proper coordinate conversion
        const canvasWidth = frameData.canvasWidth || 1080;
        const canvasHeight = frameData.canvasHeight || 1920;
        
        const frameConfig = {
          id: `shared-${draft.share_id}`,
          title: draft.title || 'Shared Frame',
          aspectRatio: frameData.aspectRatio || '9:16',
          canvasBackground: frameData.canvasBackground || frameData.background || '#f7f1ed',
          canvasWidth: canvasWidth,
          canvasHeight: canvasHeight,
          elements: frameData.elements || [],
          maxCaptures: photoElements.length || 1,
          slots: photoElements.map((el, idx) => ({
            id: el.id || `slot_${idx + 1}`,
            left: el.x / canvasWidth, // Convert absolute to normalized (0-1)
            top: el.y / canvasHeight,
            width: el.width / canvasWidth,
            height: el.height / canvasHeight,
            zIndex: el.zIndex || 1,
            photoIndex: idx,
            aspectRatio: el.data?.aspectRatio || '4:5'
          })),
          // CRITICAL: Add designer object with ALL elements
          // EditPhoto needs this to render text, shapes, stickers, etc.
          designer: {
            elements: frameData.elements || [],
            canvasBackground: frameData.canvasBackground || frameData.background || '#f7f1ed',
            aspectRatio: frameData.aspectRatio || '9:16',
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight
          },
          isCustom: true,
          isShared: true,
          shareId: draft.share_id,
          preview: draft.preview_url
        };

        console.log('🎯 [SharedFrame] Frame config created:', {
          id: frameConfig.id,
          maxCaptures: frameConfig.maxCaptures,
          slotsCount: frameConfig.slots?.length,
          hasDesigner: !!frameConfig.designer,
          designerElementsCount: frameConfig.designer?.elements?.length,
          elementTypes: frameConfig.designer?.elements?.map(el => el.type)
        });

        // CRITICAL: Use sessionStorage for shared frames to avoid conflicts
        // Do NOT use localStorage/safeStorage as it will conflict with user's personal drafts
        // sessionStorage is cleared when tab closes, perfect for temporary shared frames
        
        const sharedFrameData = {
          frameConfig: {
            ...frameConfig,
            __timestamp: Date.now(),
            __savedFrom: 'SharedFrame',
            __isSharedFrame: true // Mark as shared frame
          },
          draftData: {
            id: `shared-${draft.share_id}`,
            title: draft.title,
            aspectRatio: frameData.aspectRatio,
            elements: frameData.elements,
            canvasBackground: frameData.canvasBackground || frameData.background,
            canvasWidth: canvasWidth,
            canvasHeight: canvasHeight,
            preview: draft.preview_url
          }
        };
        
        // Store in sessionStorage only (cleared when browser tab closes)
        try {
          sessionStorage.setItem(SHARED_FRAME_KEY, JSON.stringify(sharedFrameData));
          console.log('💾 [SharedFrame] Saved to sessionStorage:', {
            frameConfigId: frameConfig.id,
            isSharedFrame: true
          });
        } catch (e) {
          console.error('❌ [SharedFrame] Failed to save to sessionStorage:', e);
          throw new Error('Failed to save shared frame data');
        }

        // Set frame via frameProvider (async, but storage is already set as backup)
        try {
          await frameProvider.setCustomFrame(frameConfig);
        } catch (providerError) {
          console.warn('⚠️ [SharedFrame] frameProvider failed, but storage backup exists:', providerError);
        }

        showToast('success', `Frame "${frameConfig.title}" dimuat!`);
        
        // Redirect ke take-moment
        setTimeout(() => {
          navigate('/take-moment', { replace: true });
        }, 300);

      } catch (err) {
        console.error('❌ [SharedFrame] Error:', err);
        setError(err.message || 'Frame tidak ditemukan');
        showToast('error', 'Frame tidak ditemukan atau tidak tersedia');
        
        // Redirect ke frames setelah 2 detik
        setTimeout(() => {
          navigate('/frames', { replace: true });
        }, 2500);
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadSharedFrame();
    }
  }, [shareId, navigate, showToast]);

  if (loading) {
    return (
      <div className="shared-frame-container">
        <div className="shared-frame-spinner" />
        <p className="shared-frame-text">Memuat frame...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shared-frame-container">
        <div className="shared-frame-emoji">😕</div>
        <h2 className="shared-frame-title">Frame Tidak Ditemukan</h2>
        <p className="shared-frame-error">{error}</p>
        <p className="shared-frame-redirect">Mengalihkan ke halaman Frames...</p>
      </div>
    );
  }

  return null;
}
