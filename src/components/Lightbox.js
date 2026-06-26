import React from 'react';
import './Lightbox.css';
import { avStr, tileStr } from '../utils/colorHelpers';

export default function Lightbox({ media, gallery, onClose, onPrev, onNext, onDelete }) {
  if (!media) return null;
  return (
    <div className="lightbox">
      <div className="lightbox__header">
        <span className="lightbox__gallery-name">{gallery && gallery.artist + ' — ' + gallery.city}</span>
        <button onClick={onClose} className="lightbox__close">×</button>
      </div>

      <div className="lightbox__stage">
        <button onClick={onPrev} className="lightbox__arrow lightbox__arrow--prev">‹</button>
        <div className="lightbox__media" style={{ background: tileStr(media.h1, media.h2, media.L) }}>
          {media.type === 'video' && (
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
            <div className="lightbox__owner-meta">{(media.type === 'video' ? 'Video' : 'Photo') + ' · ' + (gallery ? gallery.artist : '')}</div>
          </div>
        </div>
        {media.isOwn && (
          <button onClick={() => onDelete(media.id)} className="lightbox__delete-btn">Delete</button>
        )}
      </div>
    </div>
  );
}
