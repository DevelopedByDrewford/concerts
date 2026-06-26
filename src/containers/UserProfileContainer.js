import React from 'react';
import { serif, coverStr, avStr } from '../utils/colorHelpers';

export default function UserProfileContainer({
  screen,
  user, profile, galleries, slide,
  usernameStatus, storedUsername,
  editLoading, avatarUploading,
  onGoBack, onGoEditProfile, onSetScreen, onSignOut,
  onSetProfileField, onUsernameChange, onAvatarChange, onSaveProfile,
  onFlash,
}) {
  const avatarSrc    = profile.avatarUrl || user?.photoURL || null;
  const totalPhotos  = galleries.reduce((a, g) => a + g.media.filter(m => m.type === 'photo' && m.isOwn).length, 0);
  const totalVideos  = galleries.reduce((a, g) => a + g.media.filter(m => m.type === 'video' && m.isOwn).length, 0);

  const favs = [];
  galleries.forEach(g => {
    const m = g.media.find(x => x.isOwn && x.type === 'photo') || g.media.find(x => x.isOwn);
    if (m) favs.push({ m, g });
  });
  const fi     = favs.length ? slide % favs.length : 0;
  const curFav = favs[fi];

  if (screen === 'profile') {
    return (
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease both' }}>

        {/* banner */}
        <div style={{ position: 'relative', height: '150px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, animation: 'ken 16s ease-in-out infinite alternate', background: coverStr(330, 285) }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(8,7,13,0.2),#08070d)' }} />
          <button onClick={onGoBack} style={{ position: 'absolute', top: '18px', left: '18px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.12)', fontSize: '18px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        </div>

        <div style={{ padding: '0 22px', marginTop: '-44px', position: 'relative' }}>
          <div style={{ width: '86px', height: '86px', borderRadius: '50%', border: '3px solid #08070d', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden', background: avStr(320) }}>
            {avatarSrc && <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '14px' }}>
            <div>
              <div style={{ fontFamily: serif, fontSize: '30px', lineHeight: 1 }}>{profile.name || user?.displayName || 'Your Profile'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <div style={{ fontSize: '13.5px', color: 'oklch(0.6 0.01 285)' }}>
                  {profile.username
                    ? `@${profile.username}`
                    : '@' + (profile.name || user?.displayName || '').toLowerCase().replace(/\s+/g, '.')}
                </div>
                {profile.username && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://encore.drewford.dev/@${profile.username}`);
                      onFlash('Link copied!');
                    }}
                    style={{ fontSize: '10.5px', color: 'oklch(0.55 0.01 285)', background: 'oklch(0.2 0.014 285/0.5)', border: '1px solid oklch(1 0 0/0.08)', borderRadius: '6px', padding: '2px 7px', cursor: 'pointer', letterSpacing: '0.3px' }}
                  >
                    Copy link
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onGoEditProfile} className="edit-btn" style={{ padding: '9px 18px', borderRadius: '999px', border: '1px solid oklch(1 0 0/0.14)', background: 'oklch(0.2 0.014 285/0.7)', fontSize: '13px', fontWeight: 600, color: 'oklch(0.96 0.005 285)', cursor: 'pointer' }}>Edit</button>
              <button onClick={onSignOut} style={{ padding: '9px 14px', borderRadius: '999px', border: '1px solid oklch(1 0 0/0.1)', background: 'none', fontSize: '13px', color: 'oklch(0.55 0.01 285)', cursor: 'pointer' }}>Out</button>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: 'oklch(0.78 0.01 285)', marginTop: '14px', lineHeight: 1.55 }}>{profile.bio || 'Front-row regular chasing stage light and bass that you feel in your chest.'}</div>

          {(profile.location || profile.website) && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {profile.location && <div style={{ fontSize: '13px', color: 'oklch(0.58 0.01 285)' }}>📍 {profile.location}</div>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'oklch(0.68 0.14 260)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {profile.websiteLabel || profile.website}
                </a>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '26px', marginTop: '18px' }}>
            <div><span style={{ fontFamily: serif, fontSize: '24px' }}>{galleries.length}</span> <span style={{ fontSize: '13px', color: 'oklch(0.6 0.01 285)' }}>concerts</span></div>
            <div><span style={{ fontFamily: serif, fontSize: '24px' }}>{totalPhotos}</span> <span style={{ fontSize: '13px', color: 'oklch(0.6 0.01 285)' }}>photos</span></div>
            <div><span style={{ fontFamily: serif, fontSize: '24px' }}>{totalVideos}</span> <span style={{ fontSize: '13px', color: 'oklch(0.6 0.01 285)' }}>videos</span></div>
          </div>
        </div>

        {/* featured slideshow */}
        <div style={{ padding: '28px 22px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: serif, fontSize: '22px', color: 'oklch(0.9 0.01 285)' }}>Featured</div>
          <div style={{ fontSize: '12px', color: 'oklch(0.55 0.01 285)' }}>{favs.length ? (fi + 1) + ' / ' + favs.length : ''}</div>
        </div>
        {curFav && (
          <div style={{ padding: '0 22px' }}>
            <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', aspectRatio: '4/5', boxShadow: '0 14px 40px rgba(0,0,0,0.5)' }}>
              <div key={fi} style={{ position: 'absolute', inset: 0, animationName: 'kenfade', animationDuration: '4.5s', animationTimingFunction: 'ease', animationFillMode: 'both', background: coverStr(curFav.g.h1, curFav.g.h2) }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.9),transparent 55%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', left: '18px', right: '60px', bottom: '18px', pointerEvents: 'none' }}>
                <div style={{ fontSize: '11px', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'oklch(0.72 0.12 5)' }}>My favorite</div>
                <div style={{ fontFamily: serif, fontSize: '30px', lineHeight: 1.02, marginTop: '5px' }}>{curFav.g.artist}</div>
                <div style={{ fontSize: '12.5px', color: 'oklch(0.8 0.01 285)', marginTop: '3px' }}>{curFav.g.venue + ' · ' + curFav.g.city}</div>
              </div>
              <div style={{ position: 'absolute', right: '16px', bottom: '18px', display: 'flex', flexDirection: 'column', gap: '7px', alignItems: 'center' }}>
                {favs.map((_, di) => (
                  <div key={di} style={di === fi
                    ? { width: '6px', height: '20px', borderRadius: '3px', background: 'linear-gradient(180deg, oklch(0.72 0.2 5), oklch(0.64 0.2 290))', transition: 'all .35s ease' }
                    : { width: '6px', height: '6px', borderRadius: '3px', background: 'oklch(0.5 0.01 285)', transition: 'all .35s ease' }
                  } />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* concerts attended */}
        <div style={{ padding: '28px 22px 8px', fontFamily: serif, fontSize: '22px', color: 'oklch(0.9 0.01 285)' }}>Concerts attended</div>
        <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {galleries.map(g => (
            <div key={g.id} onClick={() => onGoBack(g.id)} className="concert-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px', borderRadius: '14px', background: 'oklch(0.17 0.013 285/0.5)', border: '1px solid oklch(1 0 0/0.06)', cursor: 'pointer', animation: 'fadeUp .45s ease both' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '10px', flex: 'none', background: coverStr(g.h1, g.h2) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15.5px', fontWeight: 600 }}>{g.artist}</div>
                <div style={{ fontSize: '12.5px', color: 'oklch(0.62 0.01 285)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.venue + ' · ' + g.month + ' ' + g.year}</div>
                <div style={{ fontSize: '11.5px', color: 'oklch(0.66 0.12 320)', marginTop: '4px', fontWeight: 500 }}>{g.ownCount > 0 ? g.ownCount + ' of your shots' : 'attended'}</div>
              </div>
              <div style={{ fontSize: '20px', color: 'oklch(0.5 0.01 285)' }}>›</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'editProfile') {
    const uBorder = usernameStatus === 'taken' || usernameStatus === 'invalid'
      ? '1px solid oklch(0.52 0.18 25/0.7)'
      : usernameStatus === 'available'
      ? '1px solid oklch(0.56 0.16 145/0.6)'
      : '1px solid oklch(1 0 0/0.09)';

    return (
      <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .4s ease both', padding: '22px 20px 40px' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <button onClick={() => onSetScreen('profile')} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'oklch(0.88 0.01 285)' }}>Edit profile</div>
          <div style={{ width: '36px' }} />
        </div>

        {/* avatar picker */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', border: '3px solid oklch(1 0 0/0.12)', overflow: 'hidden', background: avStr(320) }}>
              {avatarSrc && !avatarUploading && <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
              {avatarUploading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,7,13,0.6)' }}>
                  <div style={{ width: '22px', height: '22px', border: '2px solid oklch(1 0 0/0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                </div>
              )}
            </div>
            <label style={{ position: 'absolute', bottom: '2px', right: '2px', width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {[
            { label: 'NAME',     key: 'name',     type: 'text', placeholder: 'Your display name' },
            { label: 'LOCATION', key: 'location', type: 'text', placeholder: 'e.g. Austin, TX' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>{label}</label>
              <input
                type={type}
                value={profile[key]}
                onChange={onSetProfileField(key)}
                placeholder={placeholder}
                style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block' }}
              />
            </div>
          ))}

          {/* username @handle */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>USERNAME</label>
            <div style={{ position: 'relative', marginTop: '7px' }}>
              <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'oklch(0.52 0.01 285)', pointerEvents: 'none', userSelect: 'none' }}>@</div>
              <input
                type="text"
                value={profile.username}
                onChange={onUsernameChange}
                placeholder="yourhandle"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="none"
                style={{ width: '100%', padding: '14px 40px 14px 28px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: uBorder, fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block' }}
              />
              <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                {usernameStatus === 'checking' && (
                  <div style={{ width: '15px', height: '15px', border: '2px solid oklch(1 0 0/0.15)', borderTopColor: 'oklch(0.6 0.01 285)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                )}
                {usernameStatus === 'available' && <span style={{ fontSize: '14px', color: 'oklch(0.72 0.16 145)' }}>✓</span>}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <span style={{ fontSize: '14px', color: 'oklch(0.65 0.18 25)' }}>✗</span>}
              </div>
            </div>
            {usernameStatus === 'taken' && <div style={{ fontSize: '11.5px', color: 'oklch(0.65 0.18 25)', marginTop: '5px' }}>That username is already taken</div>}
            {usernameStatus === 'available' && profile.username !== storedUsername && <div style={{ fontSize: '11.5px', color: 'oklch(0.68 0.15 145)', marginTop: '5px' }}>Available</div>}
            {(usernameStatus === 'invalid' || usernameStatus === 'short') && <div style={{ fontSize: '11.5px', color: 'oklch(0.65 0.18 25)', marginTop: '5px' }}>3–20 chars · letters, numbers, _ or . · start and end with a letter or number</div>}
            {!profile.username && usernameStatus === 'idle' && <div style={{ fontSize: '11.5px', color: 'oklch(0.45 0.01 285)', marginTop: '5px' }}>Sets your profile URL: encore.app/@yourhandle</div>}
          </div>

          {/* website URL + label */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>LINK</label>
            <input
              type="url"
              value={profile.website}
              onChange={onSetProfileField('website')}
              placeholder="https://yoursite.com"
              style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px 12px 0 0', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', borderBottom: '1px solid oklch(1 0 0/0.04)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block' }}
            />
            <input
              type="text"
              value={profile.websiteLabel}
              onChange={onSetProfileField('websiteLabel')}
              placeholder="Label (e.g. Instagram, Portfolio)"
              style={{ width: '100%', padding: '12px 16px', borderRadius: '0 0 12px 12px', background: 'oklch(0.15 0.012 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', borderTop: 'none', fontSize: '13.5px', color: 'oklch(0.88 0.005 285)', boxSizing: 'border-box', outline: 'none', display: 'block' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>BIO</label>
            <textarea
              value={profile.bio}
              onChange={onSetProfileField('bio')}
              placeholder="Tell the crowd who you are…"
              rows={4}
              style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block', resize: 'none', lineHeight: 1.55 }}
            />
          </div>
        </div>

        {/* save */}
        <button
          onClick={onSaveProfile}
          disabled={editLoading}
          style={{ width: '100%', marginTop: '28px', padding: '16px', borderRadius: '14px', background: editLoading ? 'oklch(0.4 0.08 285)' : 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff', fontSize: '15.5px', fontWeight: 700, boxShadow: editLoading ? 'none' : '0 10px 30px oklch(0.64 0.2 320/0.35)', border: 'none', cursor: editLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          {editLoading && <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
          {editLoading ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    );
  }

  return null;
}
