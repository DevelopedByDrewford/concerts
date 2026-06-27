import React, { useState, useEffect, useRef } from 'react';
import './Lightbox.css';
import { avStr, tileStr } from '../utils/colorHelpers';

export default function Lightbox({ media, gallery, onClose, onPrev, onNext, onDelete, onGetVideoUrl }) {
  const [videoUrl, setVideoUrl]     = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!media) return;
    setVideoUrl(media.videoUrl || null);
    setVideoLoading(false);

    if (media.type === 'video' && !media.videoUrl && onGetVideoUrl) {
      setVideoLoading(true);
      onGetVideoUrl(media).then(url => {
        setVideoUrl(url || null);
        setVideoLoading(false);
      });
    }
  }, [media?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!media) return null;

  const isVideo   = media.type === 'video';
  const hasPhoto  = !isVideo && (media.displayUrl || media.thumbnailUrl);
  const hasVideo  = isVideo && videoUrl;
  const useFallback = !hasPhoto && !isVideo;

  return (
    <div className="lightbox">
      <div className="lightbox__header">
        <span className="lightbox__gallery-name">{gallery && gallery.artist + ' — ' + gallery.city}</span>
        <button onClick={onClose} className="lightbox__close">×</button>
      </div>

      <div className="lightbox__stage">
        <button onClick={onPrev} className="lightbox__arrow lightbox__arrow--prev">‹</button>

        <div
          className={`lightbox__media${isVideo ? ' lightbox__media--video' : ''}`}
          style={useFallback ? { background: tileStr(media.h1, media.h2, media.L) } : undefined}
        >
          {hasPhoto && (
            <img src={media.displayUrl || media.thumbnailUrl} alt="" className="lightbox__photo" />
          )}

          {isVideo && hasVideo && (
            <video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl}
              className="lightbox__video"
              controls
              autoPlay
              playsInline
            />
          )}

          {isVideo && !hasVideo && (
            <div className="lightbox__video-placeholder">
              {videoLoading
                ? <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fff' }} />
                : (
                  <>
                    <div className="lightbox__video-play">
                      <div className="lightbox__video-play__triangle" />
                    </div>
                    {media.thumbnailUrl && (
                      <img src={media.thumbnailUrl} alt="" className="lightbox__photo lightbox__photo--poster" />
                    )}
                  </>
                )
              }
            </div>
          )}

          {useFallback && isVideo && (
            <div className="lightbox__video-play">
              <div className="lightbox__video-play__triangle" />
            </div>
          )}
        </div>

        <button onClick={onNext} className="lightbox__arrow lightbox__arrow--next">›</button>
      </div>

      <div className="lightbox__footer">
        <div className="lightbox__owner">
          <div className="lightbox__owner-avatar" style={{ background: avStr(media.ownerH) }} />
          <div>
            <div className="lightbox__owner-name">{media.ownerName === 'you' ? 'you' : '@' + media.ownerName}</div>
            <div className="lightbox__owner-meta">{(isVideo ? 'Video' : 'Photo') + ' · ' + (gallery ? gallery.artist : '')}</div>
          </div>
        </div>
        {media.isOwn && (
          <button onClick={() => onDelete(media.id)} className="lightbox__delete-btn">Delete</button>
        )}
      </div>
    </div>
  );
}
