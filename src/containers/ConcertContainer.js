import React from 'react';
import { serif, coverStr, tileStr, avStr } from '../utils/colorHelpers';

export default function ConcertContainer({
  screen,
  // gallery view
  gallery, curMedia,
  onGoBack, onOpenLb, onAddMedia, onDelMedia,
  // create form
  create, onSetArtist, onSetVenue, onSetCity, onSetMonth, onSetYear, onCreateSubmit,
}) {
  if (screen === 'gallery' && gallery) {
    return (
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn .4s ease both' }}>

        {/* hero */}
        <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, animation: 'ken 16s ease-in-out infinite alternate', background: coverStr(gallery.h1, gallery.h2) }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#08070d 2%,rgba(8,7,13,0.15) 45%,rgba(8,7,13,0.45) 100%)' }} />
          <button onClick={onGoBack} style={{ position: 'absolute', top: '18px', left: '18px', width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(10,8,16,0.55)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', cursor: 'pointer' }}>‹</button>
          <div style={{ position: 'absolute', left: '22px', right: '22px', bottom: '22px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 11px', borderRadius: '999px', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '12px' }}>{gallery.month} {gallery.year}</div>
            <div style={{ fontFamily: serif, fontSize: '52px', lineHeight: 0.94, letterSpacing: '0.3px' }}>{gallery.artist}</div>
            <div style={{ marginTop: '9px', fontSize: '15px', color: 'oklch(0.85 0.01 285)' }}>{gallery.venue + ' · ' + gallery.city}</div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'flex', padding: '18px 22px', borderBottom: '1px solid oklch(1 0 0/0.06)' }}>
          {[
            [curMedia.filter(m => m.type === 'photo').length, 'Photos'],
            [curMedia.filter(m => m.type === 'video').length, 'Videos'],
            [gallery.contribCount, 'Fans'],
          ].map(([val, label], i, arr) => (
            <React.Fragment key={label}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontFamily: serif, fontSize: '28px' }}>{val}</div>
                <div style={{ fontSize: '11px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'oklch(0.6 0.01 285)', marginTop: '2px' }}>{label}</div>
              </div>
              {i < arr.length - 1 && <div style={{ width: '1px', background: 'oklch(1 0 0/0.08)' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* attendees */}
        <div style={{ padding: '18px 22px 6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex' }}>
            {[gallery.h1, gallery.h2, (gallery.h1 + 40) % 360, (gallery.h2 - 30 + 360) % 360].map((h, i) => (
              <div key={i} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #08070d', marginLeft: i === 0 ? 0 : '-9px', background: avStr(h) }} />
            ))}
          </div>
          <div style={{ fontSize: '13px', color: 'oklch(0.74 0.01 285)' }}>You and {gallery.contribCount - 1} others were here</div>
        </div>

        {/* add media */}
        <div style={{ padding: '8px 18px 18px' }}>
          <button onClick={onAddMedia} className="add-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '14px', borderRadius: '14px', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff', fontSize: '14.5px', fontWeight: 600, boxShadow: '0 8px 24px oklch(0.64 0.2 320/0.32)', border: 'none', cursor: 'pointer' }}>
            <span style={{ fontSize: '19px', fontWeight: 400, lineHeight: 0.7 }}>+</span> Add your photos &amp; videos
          </button>
        </div>

        {/* masonry grid */}
        <div style={{ padding: '0 18px', columnCount: 2, columnGap: '9px' }}>
          {curMedia.map((m, i) => (
            <div key={m.id} style={{ breakInside: 'avoid', marginBottom: '9px', position: 'relative', animationName: 'fadeUp', animationDuration: '.5s', animationTimingFunction: 'ease', animationFillMode: 'both', animationDelay: (i * 0.045) + 's' }}>
              <div onClick={() => onOpenLb(i)} className="media-item" style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid oklch(1 0 0/0.05)', aspectRatio: String(m.ratio), background: tileStr(m.h1, m.h2, m.L) }}>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.55),transparent 55%)' }} />
                {m.type === 'video' && (
                  <>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(10,8,16,0.45)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderLeft: '12px solid #fff', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: '3px' }} />
                    </div>
                    <div style={{ position: 'absolute', bottom: '8px', right: '8px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(10,8,16,0.6)', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.3px' }}>{m.duration}</div>
                  </>
                )}
                <div style={{ position: 'absolute', left: '9px', bottom: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.4)', background: avStr(m.ownerH) }} />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{m.ownerName === 'you' ? 'you' : '@' + m.ownerName}</span>
                </div>
              </div>
              {m.isOwn && (
                <button onClick={() => onDelMedia(m.id)} className="delete-btn" style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(10,8,16,0.62)', backdropFilter: 'blur(6px)', border: '1px solid oklch(1 0 0/0.14)', fontSize: '11px', fontWeight: 600, color: 'oklch(0.85 0.08 25)', cursor: 'pointer' }}>Delete</button>
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
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease both', padding: '22px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <button onClick={onGoBack} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
          <div style={{ fontSize: '12px', letterSpacing: '1.4px', textTransform: 'uppercase', color: 'oklch(0.6 0.01 285)' }}>Public gallery</div>
        </div>
        <div style={{ fontFamily: serif, fontSize: '38px', lineHeight: 1.02, marginTop: '8px' }}>Start a gallery</div>
        <div style={{ fontSize: '14px', color: 'oklch(0.7 0.01 285)', marginTop: '8px', lineHeight: 1.5 }}>Create a shared space for a show you attended. Anyone there can add their own photos and videos too.</div>

        {/* live preview */}
        <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', aspectRatio: '16/10', marginTop: '22px', boxShadow: '0 14px 40px rgba(0,0,0,0.45)' }}>
          <div style={{ position: 'absolute', inset: 0, background: coverStr(5, 290) }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.9),rgba(6,5,12,0.1) 65%)' }} />
          <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '16px' }}>
            <div style={{ fontFamily: serif, fontSize: '32px', lineHeight: 1 }}>{previewArtist}</div>
            <div style={{ marginTop: '5px', fontSize: '13px', color: 'oklch(0.82 0.01 285)' }}>{previewSub}</div>
          </div>
          <div style={{ position: 'absolute', top: '14px', left: '14px', fontSize: '10.5px', letterSpacing: '1px', textTransform: 'uppercase', color: 'oklch(0.7 0.01 285)', background: 'rgba(10,8,16,0.5)', padding: '4px 9px', borderRadius: '8px' }}>Live preview</div>
        </div>

        {/* form */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'ARTIST NAME', key: 'artist', handler: onSetArtist, placeholder: 'e.g. Beach House' },
            { label: 'VENUE',       key: 'venue',  handler: onSetVenue,  placeholder: 'e.g. The Fillmore' },
            { label: 'CITY',        key: 'city',   handler: onSetCity,   placeholder: 'e.g. San Francisco' },
          ].map(({ label, key, handler, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', color: 'oklch(0.7 0.01 285)' }}>{label}</label>
              <input value={create[key]} onChange={handler} placeholder={placeholder} style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block' }} />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', color: 'oklch(0.7 0.01 285)' }}>MONTH</label>
              <div style={{ position: 'relative', marginTop: '7px' }}>
                <select value={create.month} onChange={onSetMonth} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', appearance: 'none', WebkitAppearance: 'none', boxSizing: 'border-box', outline: 'none' }}>
                  {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                    <option key={m} value={m} style={{ color: '#000' }}>{['January','February','March','April','May','June','July','August','September','October','November','December'][i]}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid oklch(0.65 0.01 285)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', color: 'oklch(0.7 0.01 285)' }}>YEAR</label>
              <div style={{ position: 'relative', marginTop: '7px' }}>
                <select value={create.year} onChange={onSetYear} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', appearance: 'none', WebkitAppearance: 'none', boxSizing: 'border-box', outline: 'none' }}>
                  {['2026','2025','2024','2023'].map(y => (
                    <option key={y} value={y} style={{ color: '#000' }}>{y}</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid oklch(0.65 0.01 285)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={onCreateSubmit} className="create-gallery-btn" style={{ width: '100%', marginTop: '26px', padding: '16px', borderRadius: '14px', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff', fontSize: '15.5px', fontWeight: 700, boxShadow: '0 10px 30px oklch(0.64 0.2 320/0.35)', border: 'none', cursor: 'pointer', display: 'block' }}>Create gallery</button>
        <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'oklch(0.55 0.01 285)', marginTop: '12px' }}>Public · anyone can view and contribute</div>
      </div>
    );
  }

  return null;
}
