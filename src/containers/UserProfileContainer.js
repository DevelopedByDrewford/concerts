import React from 'react';
import './UserProfileContainer.css';
import { coverStr, avStr } from '../utils/colorHelpers';

const FONTS = [
  { value: '',                 family: 'Instrument Serif' },
  { value: 'Road Rage',        family: 'Road Rage' },
  { value: 'Permanent Marker', family: 'Permanent Marker' },
  { value: 'Oswald',           family: 'Oswald' },
  { value: 'Caveat',           family: 'Caveat' },
  { value: 'Doto',             family: 'Doto' },
  { value: 'Federo',           family: 'Federo' },
  { value: 'Unica One',        family: 'Unica One' },
  { value: 'Lavishly Yours',   family: 'Lavishly Yours' },
  { value: 'Mystery Quest',    family: 'Mystery Quest' },
  { value: 'Marck Script',     family: 'Marck Script' },
  { value: 'Felipa',           family: 'Felipa' },
  { value: 'Special Elite',    family: 'Special Elite' },
  { value: 'Irish Grover',     family: 'Irish Grover' },
  { value: 'Asimovian',        family: 'Asimovian' },
];

export default function UserProfileContainer({
  screen,
  user, profile, profileLoading = false, galleries, isOwn = true, slide,
  followStatus, followerCount, followingCount,
  usernameStatus, storedUsername,
  editLoading, avatarUploading, bannerUploading,
  onGoBack, onGoEditProfile, onSetScreen, onSignOut,
  onSetProfileField, onUsernameChange, onAvatarChange, onBannerChange, onSaveProfile,
  onFollow, onUnfollow, onOpenFollowList,
  onFlash,
}) {
  const avatarSrc = profile.avatarUrl || user?.photoURL || null;

  const favs = [];
  galleries.forEach(g => {
    const m = g.media.find(x => x.isOwn && x.type === 'photo') || g.media.find(x => x.isOwn);
    if (m) favs.push({ m, g });
  });
  const fi     = favs.length ? slide % favs.length : 0;
  const curFav = favs[fi];

  if (screen === 'profile' && profileLoading) {
    return (
      <div className="profile profile--skeleton">
        <div className="profile__banner">
          <div className="skel skel--banner" />
        </div>
        <div className="profile__body">
          <div className="skel skel--avatar" />
          <div className="profile__identity-row" style={{ marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <div className="skel skel--name" />
              <div className="skel skel--handle" />
            </div>
          </div>
          <div className="skel skel--bio" />
          <div className="skel skel--bio skel--bio-short" />
          <div className="profile__stats" style={{ marginTop: 18 }}>
            <div className="skel skel--stat" />
            <div className="skel skel--stat" />
            <div className="skel skel--stat" />
          </div>
        </div>
        <div className="profile__featured-header">
          <div className="skel skel--section-title" />
        </div>
        <div className="profile__featured-card-wrap">
          <div className="skel skel--featured-card" />
        </div>
        <div style={{ padding: '28px 22px 8px' }}>
          <div className="skel skel--section-title" />
        </div>
        <div className="profile__concerts-list">
          {[0, 1, 2].map(i => (
            <div key={i} className="concert-row" style={{ cursor: 'default' }}>
              <div className="skel skel--concert-thumb" />
              <div style={{ flex: 1 }}>
                <div className="skel skel--concert-artist" />
                <div className="skel skel--concert-meta" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'profile') {
    return (
      <div className="profile">

        <div className="profile__banner">
          {profile.bannerUrl
            ? <img src={profile.bannerUrl} alt="" className="profile__banner-img" />
            : <div className="profile__banner-cover" style={{ background: coverStr(330, 285) }} />
          }
          <div className="profile__banner-scrim" />
          {/* <button onClick={onGoBack} className="profile__banner-back">‹</button> */}
          <button className="profile__banner-back" onClick={() => window.location.href = '/'}>‹</button>
        </div>

        <div className="profile__body">
          <div className="profile__avatar" style={{ background: avStr(320) }}>
            {avatarSrc && <img src={avatarSrc} alt="" />}
          </div>

          <div className="profile__identity-row">
            <div>
              <div
                className="profile__name"
                style={profile.nameFont ? { fontFamily: `'${profile.nameFont}', serif` } : undefined}
              >
                {profile.name || 'Your Profile'}
              </div>
              <div className="profile__handle-row">
                <span className="profile__handle">
                  {profile.username ? `@${profile.username}` : ''}
                </span>
                {profile.username && (
                  <button
                    className="profile__copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://encore.drewford.dev/@${profile.username}`);
                      onFlash('Link copied!');
                    }}
                  >
                    Copy link
                  </button>
                )}
              </div>
            </div>
            {isOwn ? (
              <div className="profile__actions">
                <button onClick={onGoEditProfile} className="profile__edit-btn edit-btn">Edit</button>
                <button onClick={onSignOut} className="profile__signout-btn">Sign Out</button>
              </div>
            ) : user && (
              <button
                onClick={followStatus === 'following' ? onUnfollow : onFollow}
                disabled={!followStatus || followStatus === 'loading'}
                className={`profile__follow-btn${followStatus === 'following' ? ' profile__follow-btn--following' : ''}${followStatus === 'loading' ? ' profile__follow-btn--loading' : ''}`}
              >
                {followStatus === 'loading' ? '…' : followStatus === 'following' ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          <div className="profile__bio">{profile.bio || 'Front-row regular chasing stage light and bass that you feel in your chest.'}</div>

          {(profile.location || profile.website) && (
            <div className="profile__meta-row">
              {profile.location && <span className="profile__location">📍 {profile.location}</span>}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="profile__link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  {profile.websiteLabel || profile.website}
                </a>
              )}
            </div>
          )}

          <div className="profile__stats">
            <div><span className="profile__stat-value">{galleries.length}</span> <span className="profile__stat-label">concerts</span></div>
            <div className="profile__stat--link" onClick={() => onOpenFollowList('followers')}>
              <span className="profile__stat-value">{followerCount ?? '—'}</span>
              <span className="profile__stat-label">followers</span>
            </div>
            <div className="profile__stat--link" onClick={() => onOpenFollowList('following')}>
              <span className="profile__stat-value">{followingCount ?? '—'}</span>
              <span className="profile__stat-label">following</span>
            </div>
          </div>
        </div>

        <div className="profile__featured-header">
          <span className="profile__featured-title">Featured</span>
          <span className="profile__featured-counter">{favs.length ? (fi + 1) + ' / ' + favs.length : ''}</span>
        </div>

        {curFav && (
          <div className="profile__featured-card-wrap">
            <div className="profile__featured-card">
              <div
                key={fi}
                className="profile__featured-cover"
                style={curFav.g.coverUrl ? {
                  backgroundImage: `url(${curFav.g.coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : { background: coverStr(curFav.g.h1, curFav.g.h2) }}
              />
              <div className="profile__featured-scrim" />
              <div className="profile__featured-info">
                <div className="profile__featured-eyebrow">My favorite</div>
                <div className="profile__featured-artist">{curFav.g.artist}</div>
                <div className="profile__featured-venue">{curFav.g.venue + ' · ' + curFav.g.city}</div>
              </div>
              <div className="profile__featured-dots">
                {favs.map((_, di) => (
                  <div key={di} className={di === fi ? 'profile__featured-dot profile__featured-dot--active' : 'profile__featured-dot profile__featured-dot--inactive'} />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="profile__concerts-title">Concerts attended</div>
        <div className="profile__concerts-list">
          {galleries.map(g => (
            <div key={g.id} onClick={() => onGoBack(g.id)} className="concert-row">
              <div
                className="concert-row__thumb"
                style={g.coverUrl ? {
                  backgroundImage: `url(${g.coverUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : { background: coverStr(g.h1, g.h2) }}
              />
              <div className="concert-row__info">
                <div className="concert-row__artist">{g.artist}</div>
                <div className="concert-row__meta">{g.venue + ' · ' + g.month + ' ' + g.year}</div>
                <div className="concert-row__shots">{g.ownCount > 0 ? g.ownCount + ' of your shots' : 'attended'}</div>
              </div>
              <span className="concert-row__chevron">›</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'editProfile') {
    const inputMod = (usernameStatus === 'taken' || usernameStatus === 'invalid')
      ? 'username-field__input--error'
      : usernameStatus === 'available'
      ? 'username-field__input--ok'
      : 'username-field__input--idle';

    return (
      <div className="edit-profile">

        <div className="edit-profile__header">
          <button onClick={() => onSetScreen('profile')} className="btn-back">‹</button>
          <span className="edit-profile__title">Edit profile</span>
          <div className="edit-profile__header-spacer" />
        </div>

        <div className="edit-profile__banner-section">
          <div
            className="edit-profile__banner-preview"
            style={profile.bannerUrl ? undefined : { background: coverStr(330, 285) }}
          >
            {profile.bannerUrl && <img src={profile.bannerUrl} alt="" className="edit-profile__banner-img" />}
            {bannerUploading && (
              <div className="edit-profile__banner-overlay">
                <div className="spinner" style={{ width: '24px', height: '24px', border: '2px solid oklch(1 0 0/0.3)', borderTopColor: '#fff' }} />
              </div>
            )}
            <label className="edit-profile__banner-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <input type="file" accept="image/*" onChange={onBannerChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div className="edit-profile__avatar-wrap">
          <div className="edit-profile__avatar-relative">
            <div className="edit-profile__avatar-circle" style={{ background: avStr(320) }}>
              {avatarSrc && !avatarUploading && <img src={avatarSrc} alt="" />}
              {avatarUploading && (
                <div className="edit-profile__avatar-overlay">
                  <div className="spinner" style={{ width: '22px', height: '22px', border: '2px solid oklch(1 0 0/0.3)', borderTopColor: '#fff' }} />
                </div>
              )}
            </div>
            <label className="edit-profile__camera-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <input type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        <div className="edit-profile__fields">
          <div>
            <label className="field-label">NAME</label>
            <input type="text" value={profile.name} onChange={onSetProfileField('name')} placeholder="Your display name" className="field-input" />
          </div>

          <div>
            <label className="field-label">NAME FONT</label>
            <div className="font-picker">
              {FONTS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => onSetProfileField('nameFont')({ target: { value: f.value } })}
                  className={`font-picker__option${profile.nameFont === f.value ? ' font-picker__option--active' : ''}`}
                  style={{ fontFamily: `'${f.family}', serif` }}
                >
                  {profile.name || 'Your Name'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">LOCATION</label>
            <input type="text" value={profile.location} onChange={onSetProfileField('location')} placeholder="e.g. Austin, TX" className="field-input" />
          </div>

          <div>
            <label className="field-label">USERNAME</label>
            <div className="username-field">
              <span className="username-field__at">@</span>
              <input
                type="text"
                value={profile.username}
                onChange={onUsernameChange}
                placeholder="yourhandle"
                maxLength={20}
                autoComplete="off"
                autoCapitalize="none"
                className={`username-field__input ${inputMod}`}
              />
              <div className="username-field__status">
                {usernameStatus === 'checking'  && <div className="spinner username-field__spinner" />}
                {usernameStatus === 'available' && <span className="username-field__check">✓</span>}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <span className="username-field__cross">✗</span>}
              </div>
            </div>
            {usernameStatus === 'taken' && <div className="username-hint username-hint--error">That username is already taken</div>}
            {usernameStatus === 'available' && profile.username !== storedUsername && <div className="username-hint username-hint--ok">Available</div>}
            {(usernameStatus === 'invalid' || usernameStatus === 'short') && <div className="username-hint username-hint--error">3–20 chars · letters, numbers, _ or . · start and end with a letter or number</div>}
            {!profile.username && usernameStatus === 'idle' && <div className="username-hint username-hint--quiet">Sets your profile URL: encore.app/@yourhandle</div>}
          </div>

          <div>
            <label className="field-label">LINK</label>
            <input type="url" value={profile.website} onChange={onSetProfileField('website')} placeholder="https://yoursite.com" className="link-pair__url" />
            <input type="text" value={profile.websiteLabel} onChange={onSetProfileField('websiteLabel')} placeholder="Label (e.g. Instagram, Portfolio)" className="link-pair__label" />
          </div>

          <div>
            <label className="field-label">BIO</label>
            <textarea value={profile.bio} onChange={onSetProfileField('bio')} placeholder="Tell the crowd who you are…" rows={4} className="bio-textarea" />
          </div>
        </div>

        <button onClick={onSaveProfile} disabled={editLoading} className="btn-accent" style={{ marginTop: '28px' }}>
          {editLoading && <div className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff' }} />}
          {editLoading ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    );
  }

  return null;
}
