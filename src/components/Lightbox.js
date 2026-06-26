import React from 'react';
import { avStr, tileStr } from '../utils/colorHelpers';

export default function Lightbox({ media, gallery, onClose, onPrev, onNext, onDelete }) {
  if (!media) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(5,4,9,0.94)', backdropFilter: 'blur(14px)', animation: 'fadeIn .3s ease both', display: 'flex', flexDirection: 'column', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
        <div style={{ fontSize: '13px', color: 'oklch(0.7 0.01 285)' }}>{gallery && gallery.artist + ' — ' + gallery.city}</div>
        <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.12)', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>
        <button onClick={onPrev} style={{ position: 'absolute', left: '18px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(20,16,28,0.6)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '22px', color: '#fff', zIndex: 2, cursor: 'pointer' }}>‹</button>
        <div style={{ position: 'relative', width: '100%', maxHeight: '72vh', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', animation: 'scaleIn .35s ease both', background: tileStr(media.h1, media.h2, media.L) }}>
          {media.type === 'video' && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '62px', height: '62px', borderRadius: '50%', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(6px)', border: '2px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '18px solid #fff', borderTop: '11px solid transparent', borderBottom: '11px solid transparent', marginLeft: '4px' }} />
            </div>
          )}
        </div>
        <button onClick={onNext} style={{ position: 'absolute', right: '18px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(20,16,28,0.6)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '22px', color: '#fff', zIndex: 2, cursor: 'pointer' }}>›</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: avStr(media.ownerH) }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{media.ownerName === 'you' ? 'you' : '@' + media.ownerName}</div>
            <div style={{ fontSize: '11.5px', color: 'oklch(0.58 0.01 285)' }}>{(media.type === 'video' ? 'Video' : 'Photo') + ' · ' + (gallery ? gallery.artist : '')}</div>
          </div>
        </div>
        {media.isOwn && (
          <button onClick={() => onDelete(media.id)} style={{ padding: '9px 16px', borderRadius: '999px', background: 'oklch(0.3 0.13 25/0.4)', border: '1px solid oklch(0.5 0.13 25/0.4)', fontSize: '13px', fontWeight: 600, color: 'oklch(0.82 0.1 25)', cursor: 'pointer' }}>Delete</button>
        )}
      </div>
    </div>
  );
}
