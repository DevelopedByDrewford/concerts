import React from 'react';
import './ConcertContainer.css';
import { coverStr, tileStr, avStr } from '../utils/colorHelpers';

export default function ConcertContainer({
  screen,
  gallery, curMedia,
  onGoBack, onOpenLb, onAddMedia, onDelMedia,
  create, onSetArtist, onSetVenue, onSetCity, onSetMonth, onSetYear, onCreateSubmit,
}) {
  if (screen === 'gallery' && gallery) {
    return (
      <div className="gallery">

        <div className="gallery__hero">
          <div className="gallery__hero-cover" style={{ background: coverStr(gallery.h1, gallery.h2) }} />
          <div className="gallery__hero-scrim" />
          <button onClick={onGoBack} className="gallery__hero-back">‹</button>
          <div className="gallery__hero-info">
            <div className="gallery__date-pill">{gallery.month} {gallery.year}</div>
            <div className="gallery__artist">{gallery.artist}</div>
            <div className="gallery__venue">{gallery.venue + ' · ' + gallery.city}</div>
          </div>
        </div>

        <div className="gallery__stats">
          {[
            [curMedia.filter(m => m.type === 'photo').length, 'Photos'],
            [curMedia.filter(m => m.type === 'video').length, 'Videos'],
            [gallery.contribCount, 'Fans'],
          ].map(([val, label], i, arr) => (
            <React.Fragment key={label}>
              <div className="gallery__stat">
                <div className="gallery__stat-value">{val}</div>
                <div className="gallery__stat-label">{label}</div>
              </div>
              {i < arr.length - 1 && <div className="gallery__stat-divider" />}
            </React.Fragment>
          ))}
        </div>

        <div className="gallery__attendees">
          <div className="gallery__attendee-stack">
            {[gallery.h1, gallery.h2, (gallery.h1 + 40) % 360, (gallery.h2 - 30 + 360) % 360].map((h, i) => (
              <div key={i} className="avatar-stack__item" style={{ background: avStr(h) }} />
            ))}
          </div>
          <span className="gallery__attendee-text">You and {gallery.contribCount - 1} others were here</span>
        </div>

        <div className="gallery__add-wrap">
          <button onClick={onAddMedia} className="gallery__add-btn add-btn">
            <span style={{ fontSize: '19px', fontWeight: 400, lineHeight: 0.7 }}>+</span> Add your photos &amp; videos
          </button>
        </div>

        <div className="gallery__grid">
          {curMedia.map((m, i) => (
            <div key={m.id} className="gallery__grid-item" style={{ animationDelay: (i * 0.045) + 's' }}>
              <div
                onClick={() => onOpenLb(i)}
                className="gallery__tile media-item"
                style={{ background: tileStr(m.h1, m.h2, m.L), aspectRatio: String(m.ratio) }}
              >
                <div className="gallery__tile-scrim" />
                {m.type === 'video' && (
                  <>
                    <div className="gallery__tile-play">
                      <div className="gallery__tile-play__triangle" />
                    </div>
                    <div className="gallery__tile-duration">{m.duration}</div>
                  </>
                )}
                <div className="gallery__tile-owner">
                  <div className="gallery__tile-avatar" style={{ background: avStr(m.ownerH) }} />
                  <span className="gallery__tile-name">{m.ownerName === 'you' ? 'you' : '@' + m.ownerName}</span>
                </div>
              </div>
              {m.isOwn && (
                <button onClick={() => onDelMedia(m.id)} className="gallery__delete-btn delete-btn">Delete</button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'create') {
    const previewArtist = create.artist || 'Artist name';
    const previewSub    = (create.venue || 'Venue') + ' · ' + (create.city || 'City') + ' · ' + create.month + ' ' + create.year;

    return (
      <div className="create">
        <div className="create__topbar">
          <button onClick={onGoBack} className="btn-back">‹</button>
          <span className="create__topbar-label">Public gallery</span>
        </div>
        <div className="create__heading">Start a gallery</div>
        <div className="create__description">Create a shared space for a show you attended. Anyone there can add their own photos and videos too.</div>

        <div className="create__preview">
          <div className="create__preview-cover" style={{ background: coverStr(5, 290) }} />
          <div className="create__preview-scrim" />
          <div className="create__preview-info">
            <div className="create__preview-title">{previewArtist}</div>
            <div className="create__preview-meta">{previewSub}</div>
          </div>
          <div className="create__preview-badge">Live preview</div>
        </div>

        <div className="create__form">
          {[
            { label: 'ARTIST NAME', key: 'artist', handler: onSetArtist, placeholder: 'e.g. Beach House' },
            { label: 'VENUE',       key: 'venue',  handler: onSetVenue,  placeholder: 'e.g. The Fillmore' },
            { label: 'CITY',        key: 'city',   handler: onSetCity,   placeholder: 'e.g. San Francisco' },
          ].map(({ label, key, handler, placeholder }) => (
            <div key={key}>
              <label className="create__form-label">{label}</label>
              <input value={create[key]} onChange={handler} placeholder={placeholder} className="field-input" />
            </div>
          ))}

          <div className="create__row">
            <div style={{ flex: 1 }}>
              <label className="create__form-label">MONTH</label>
              <div className="create__select-wrap">
                <select value={create.month} onChange={onSetMonth} className="create__select">
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={m} value={m} style={{ color: '#000' }}>{['January','February','March','April','May','June','July','August','September','October','November','December'][i]}</option>
                  ))}
                </select>
                <div className="create__select-caret" />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label className="create__form-label">YEAR</label>
              <div className="create__select-wrap">
                <select value={create.year} onChange={onSetYear} className="create__select">
                  {['2026','2025','2024','2023'].map(y => (
                    <option key={y} value={y} style={{ color: '#000' }}>{y}</option>
                  ))}
                </select>
                <div className="create__select-caret" />
              </div>
            </div>
          </div>
        </div>

        <button onClick={onCreateSubmit} className="btn-accent create-gallery-btn" style={{ marginTop: '26px' }}>Create gallery</button>
        <div className="create__footer-note">Public · anyone can view and contribute</div>
      </div>
    );
  }

  return null;
}
