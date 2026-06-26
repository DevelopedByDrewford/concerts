import React from 'react';
import './App.css';
import { auth, signInWithGoogle, signOutUser, loadUserProfile, saveUserProfile, uploadAvatar, checkUsernameAvailable, callChangeUsername } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(seed) {
  const x = Math.sin(seed * 99.13) * 43758.5453;
  return x - Math.floor(x);
}

function coverStr(h1, h2, L = 0.24) {
  return (
    `radial-gradient(110% 78% at 26% 8%, oklch(0.64 0.22 ${h1} / 0.6), transparent 56%), ` +
    `radial-gradient(95% 70% at 84% 96%, oklch(0.56 0.2 ${h2} / 0.52), transparent 54%), ` +
    `radial-gradient(40% 30% at 60% 38%, oklch(0.78 0.16 ${h1} / 0.35), transparent 60%), ` +
    `linear-gradient(162deg, oklch(${L} 0.06 ${h1}), oklch(0.09 0.02 ${h2}))`
  );
}

function tileStr(h1, h2, L) {
  return (
    `radial-gradient(80% 60% at ${30 + h1 % 30}% 16%, oklch(0.62 0.2 ${h1} / 0.62), transparent 58%), ` +
    `radial-gradient(70% 55% at 78% 90%, oklch(0.5 0.18 ${h2} / 0.45), transparent 56%), ` +
    `linear-gradient(165deg, oklch(${L} 0.06 ${h1}), oklch(0.08 0.02 ${h2}))`
  );
}

function avStr(h) {
  return `linear-gradient(135deg, oklch(0.62 0.18 ${h}), oklch(0.5 0.18 ${(h + 45) % 360}))`;
}

// ── build gallery data once ───────────────────────────────────────────────────

function buildGalleries() {
  const defs = [
    { artist: 'Phoebe Bridgers', venue: 'The Greek Theatre', city: 'Los Angeles',   month: 'Sep', year: '2025', h1: 330, h2: 285 },
    { artist: 'Fred again..',    venue: 'Brooklyn Steel',    city: 'New York',       month: 'Nov', year: '2025', h1: 288, h2: 200 },
    { artist: 'Mitski',          venue: 'The Fillmore',      city: 'San Francisco',  month: 'Aug', year: '2025', h1: 18,  h2: 330 },
    { artist: 'Bonobo',          venue: 'Red Rocks',         city: 'Morrison, CO',   month: 'Jul', year: '2025', h1: 200, h2: 160 },
    { artist: 'Jamie xx',        venue: 'Aragon Ballroom',   city: 'Chicago',        month: 'Oct', year: '2025', h1: 285, h2: 335 },
    { artist: 'Beach House',     venue: 'The Anthem',        city: 'Washington DC',  month: 'Jun', year: '2025', h1: 262, h2: 205 },
  ];
  const names = ['mara.k', 'dustinr', 'leoshoots', 'ava_m', 'noah.p', 'sofia.l', 'kenji', 'remy_w', 'tash'];
  const aspects = [1.25, 1.33, 1, 1.25, 1.78, 1.33, 1.25, 1, 1.5];

  defs.forEach((g, gi) => {
    const n = 9 + (gi % 3) * 2;
    g.media = [];
    let vid = 0, own = 0;
    for (let i = 0; i < n; i++) {
      const r = rand(gi * 100 + i);
      const isVid = r > 0.79;
      const isOwn = rand(gi * 100 + i + 7) > 0.66;
      if (isVid) vid++;
      if (isOwn) own++;
      g.media.push({
        id: gi + '-' + i,
        ratio: aspects[i % aspects.length],
        type: isVid ? 'video' : 'photo',
        duration: isVid ? '0:' + (12 + Math.floor(r * 44)) : null,
        h1: g.h1 + (r * 46 - 23),
        h2: g.h2 + (rand(gi + i) * 30 - 15),
        L: 0.16 + r * 0.12,
        isOwn,
        ownerName: isOwn ? 'you' : names[Math.floor(rand(gi * 7 + i) * names.length)],
        ownerH: isOwn ? 320 : Math.floor(rand(gi * 13 + i) * 360),
      });
    }
    g.id = String(gi);
    g.photoCount = g.media.filter(m => m.type === 'photo').length;
    g.videoCount = vid;
    g.contribCount = 6 + (gi * 5 + 3) % 40;
    g.ownCount = own;
  });
  return defs;
}

const INITIAL_GALLERIES = buildGalleries();

// ── component ─────────────────────────────────────────────────────────────────

class App extends React.Component {
  state = {
    screen: 'home',
    activeId: null,
    lb: null,
    slide: 0,
    deleted: {},
    extra: {},
    toast: '',
    galleries: INITIAL_GALLERIES,
    create: { artist: '', venue: '', city: '', month: 'Sep', year: '2025' },
    user: null,
    loginModal: false,
    loginLoading: false,
    profile: { name: '', username: '', bio: '', location: '', website: '', websiteLabel: '', avatarUrl: null },
    editLoading: false,
    avatarUploading: false,
    usernameStatus: 'idle', // 'idle'|'checking'|'available'|'taken'|'invalid'
  };

  _storedUsername = ''; // tracks the last-saved @handle to detect changes
  _usernameTimer  = null;

  componentDidMount() {
    this._iv = setInterval(() => {
      if (this.state.screen === 'profile') this.setState(s => ({ slide: s.slide + 1 }));
    }, 4500);
    this._unsubAuth = onAuthStateChanged(auth, async user => {
      if (user) {
        const stored = await loadUserProfile(user.uid);
        // Legacy: old profiles stored display name in "username" field.
        // Detect by presence of spaces or uppercase (handles aren't allowed to have them).
        const rawStored = stored?.username || '';
        const isLegacyDisplayName = /\s/.test(rawStored) || rawStored !== rawStored.toLowerCase();
        const handle = isLegacyDisplayName ? '' : rawStored;
        this._storedUsername = handle;
        this.setState({
          user,
          profile: {
            name:         stored?.name         || (isLegacyDisplayName ? rawStored : '') || user.displayName || '',
            username:     handle,
            bio:          stored?.bio           || '',
            location:     stored?.location      || '',
            website:      stored?.website       || '',
            websiteLabel: stored?.websiteLabel  || '',
            avatarUrl:    stored?.profilePhotoUrl || null,
          },
        });
      } else {
        this._storedUsername = '';
        this.setState({ user: null, profile: { name: '', username: '', bio: '', location: '', website: '', websiteLabel: '', avatarUrl: null } });
      }
    });
  }

  componentWillUnmount() {
    clearInterval(this._iv);
    if (this._tt) clearTimeout(this._tt);
    if (this._unsubAuth) this._unsubAuth();
  }

  flash(msg) {
    this.setState({ toast: msg });
    if (this._tt) clearTimeout(this._tt);
    this._tt = setTimeout(() => this.setState({ toast: '' }), 1900);
  }

  goHome    = () => this.setState({ screen: 'home',    lb: null });
  goCreate  = () => this.setState({ screen: 'create',  lb: null });
  goProfile = () => {
    if (!this.state.user) { this.setState({ loginModal: true }); return; }
    this.setState({ screen: 'profile', lb: null, slide: 0 });
  };
  goBack    = () => this.setState({ screen: 'home',    lb: null });

  openLoginModal  = () => this.setState({ loginModal: true });
  closeLoginModal = () => this.setState({ loginModal: false, loginLoading: false });

  goEditProfile = () => this.setState({ screen: 'editProfile', lb: null });

  setProfileField = (k) => (e) => {
    const v = e.target.value;
    this.setState(s => ({ profile: { ...s.profile, [k]: v } }));
  };

  handleUsernameChange = (e) => {
    // Auto-sanitize to allowed chars (lowercase, alphanum, dot, underscore)
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    this.setState(s => ({ profile: { ...s.profile, username: val }, usernameStatus: 'idle' }));

    if (this._usernameTimer) clearTimeout(this._usernameTimer);
    if (!val) return;

    // Same as stored — no check needed
    if (val === this._storedUsername) {
      this.setState({ usernameStatus: 'available' });
      return;
    }

    const validFormat = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$|^[a-z0-9]{3}$/.test(val)
      && !/\.{2}|_{2}/.test(val);

    if (val.length < 3) {
      this.setState({ usernameStatus: 'short' });
      return;
    }
    if (!validFormat) {
      this.setState({ usernameStatus: 'invalid' });
      return;
    }

    this.setState({ usernameStatus: 'checking' });
    this._usernameTimer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(val, this.state.user?.uid);
        this.setState({ usernameStatus: available ? 'available' : 'taken' });
      } catch {
        this.setState({ usernameStatus: 'idle' });
      }
    }, 420);
  };

  handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !this.state.user) return;
    this.setState({ avatarUploading: true });
    try {
      const url = await uploadAvatar(this.state.user.uid, file);
      this.setState(s => ({ profile: { ...s.profile, avatarUrl: url }, avatarUploading: false }));
    } catch {
      this.setState({ avatarUploading: false });
      this.flash('Avatar upload failed');
    }
  };

  saveProfile = async () => {
    const { user, profile, usernameStatus } = this.state;
    if (!user) return;

    // Block save if the username field has a pending check or is invalid
    if (usernameStatus === 'checking') {
      this.flash('Still checking username — wait a moment');
      return;
    }
    if (usernameStatus === 'taken') {
      this.flash('Username is already taken');
      return;
    }
    if (usernameStatus === 'invalid' || usernameStatus === 'short') {
      this.flash('Username format is invalid');
      return;
    }

    this.setState({ editLoading: true });
    try {
      // Username change is handled atomically by the Cloud Function
      if (profile.username && profile.username !== this._storedUsername) {
        await callChangeUsername(profile.username);
        this._storedUsername = profile.username;
      }

      await saveUserProfile(user.uid, {
        name:            profile.name,
        bio:             profile.bio,
        location:        profile.location,
        website:         profile.website,
        websiteLabel:    profile.websiteLabel,
        profilePhotoUrl: profile.avatarUrl || null,
      });
      this.setState({ editLoading: false, screen: 'profile', slide: 0, usernameStatus: 'idle' });
      this.flash('Profile saved');
    } catch (err) {
      this.setState({ editLoading: false });
      const isConflict = err?.code === 'functions/already-exists' || err?.message?.includes('already taken');
      this.flash(isConflict ? 'Username already taken — choose another' : 'Save failed — try again');
    }
  };

  handleGoogleSignIn = async () => {
    this.setState({ loginLoading: true });
    try {
      await signInWithGoogle();
      this.setState({ loginModal: false, loginLoading: false, screen: 'profile', slide: 0, lb: null });
    } catch (err) {
      // user closed the popup or auth failed
      this.setState({ loginLoading: false });
    }
  };

  handleSignOut = async () => {
    await signOutUser();
    this.setState({ screen: 'home', user: null });
    this.flash('Signed out');
  };

  openGallery = (id) => {
    this.setState({ screen: 'gallery', activeId: id, lb: null });
    window.scrollTo(0, 0);
  };

  openLb  = (i) => this.setState({ lb: i });
  closeLb = () => this.setState({ lb: null });
  nextLb  = () => {
    const { galleries, activeId, deleted, extra, lb } = this.state;
    const ag = galleries.find(g => g.id === activeId);
    if (!ag) return;
    const cm = (extra[ag.id] || []).concat(ag.media.filter(m => !deleted[m.id]));
    this.setState({ lb: (lb + 1) % cm.length });
  };
  prevLb  = () => {
    const { galleries, activeId, deleted, extra, lb } = this.state;
    const ag = galleries.find(g => g.id === activeId);
    if (!ag) return;
    const cm = (extra[ag.id] || []).concat(ag.media.filter(m => !deleted[m.id]));
    this.setState({ lb: (lb - 1 + cm.length) % cm.length });
  };

  delMedia = (id) => {
    this.setState(s => ({ deleted: { ...s.deleted, [id]: true }, lb: null }));
    this.flash('Removed from gallery');
  };

  addMedia = () => {
    const { galleries, activeId } = this.state;
    const ag = galleries.find(g => g.id === activeId);
    if (!ag) return;
    const t = Date.now();
    const items = [0, 1].map(k => ({
      id: 'own-' + t + '-' + k, ratio: [1.25, 1][k], type: 'photo', duration: null,
      h1: ag.h1 + (k ? 30 : -10), h2: ag.h2 + (k ? -12 : 18), L: 0.24,
      isOwn: true, ownerName: 'you', ownerH: 320,
    }));
    this.setState(s => ({ extra: { ...s.extra, [ag.id]: items.concat(s.extra[ag.id] || []) } }));
    this.flash('Added 2 photos to the gallery');
  };

  setF = (k) => (e) => {
    const v = e.target.value;
    this.setState(s => ({ create: { ...s.create, [k]: v } }));
  };
  setArtist = this.setF('artist');
  setVenue  = this.setF('venue');
  setCity   = this.setF('city');
  setMonth  = this.setF('month');
  setYear   = this.setF('year');

  createSubmit = () => {
    const c = this.state.create;
    const g = {
      id: 'new-' + Date.now(),
      artist: c.artist || 'Untitled Show',
      venue: c.venue || 'Venue',
      city: c.city || 'City',
      month: c.month, year: c.year,
      h1: 5, h2: 290,
      media: [], photoCount: 0, videoCount: 0, contribCount: 1, ownCount: 0,
    };
    const aspects = [1.25, 1, 1.33, 1.25];
    for (let i = 0; i < 4; i++) {
      g.media.push({
        id: g.id + '-' + i, ratio: aspects[i], type: 'photo', duration: null,
        h1: 5 + (i * 12), h2: 290 - (i * 8), L: 0.22,
        isOwn: true, ownerName: 'you', ownerH: 320,
      });
    }
    g.photoCount = 4; g.ownCount = 4;
    this.setState(s => ({
      galleries: [g, ...s.galleries],
      screen: 'gallery',
      activeId: g.id,
      create: { artist: '', venue: '', city: '', month: 'Sep', year: '2025' },
    }));
    window.scrollTo(0, 0);
    this.flash('Gallery created — invite your friends');
  };

  render() {
    const { screen, activeId, lb, slide, deleted, extra, toast, galleries, create, user, loginModal, loginLoading, profile, editLoading, avatarUploading, usernameStatus } = this.state;

    const isHome        = screen === 'home';
    const isGallery     = screen === 'gallery';
    const isCreate      = screen === 'create';
    const isProfile     = screen === 'profile';
    const isEditProfile = screen === 'editProfile';

    const avatarSrc = profile.avatarUrl || user?.photoURL || null;

    const ag = galleries.find(g => g.id === activeId);
    const curMedia = ag
      ? (extra[ag.id] || []).concat(ag.media.filter(m => !deleted[m.id]))
      : [];

    const lbMedia = lb != null ? curMedia[lb] : null;
    const hasLb   = lbMedia != null;

    // profile favorites
    const favs = [];
    galleries.forEach(g => {
      const m = g.media.find(x => x.isOwn && x.type === 'photo') || g.media.find(x => x.isOwn);
      if (m) favs.push({ m, g });
    });
    const fi     = favs.length ? slide % favs.length : 0;
    const curFav = favs[fi];

    const totalPhotos = galleries.reduce((a, g) => a + g.media.filter(m => m.type === 'photo' && m.isOwn).length, 0);
    const totalVideos = galleries.reduce((a, g) => a + g.media.filter(m => m.type === 'video' && m.isOwn).length, 0);

    // create preview
    const previewArtist = create.artist || 'Artist name';
    const previewSub    = (create.venue || 'Venue') + ' · ' + (create.city || 'City') + ' · ' + create.month + ' ' + create.year;

    // nav button styles
    const navBase = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' };
    const navOn   = { ...navBase, color: 'oklch(0.97 0.005 285)' };
    const navOff  = { ...navBase, color: 'oklch(0.5 0.01 285)' };

    // common styles
    const serif = "'Instrument Serif', serif";

    return (
      <div style={{ position: 'relative', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', background: 'linear-gradient(180deg,#0c0a14,#08070d)', color: 'oklch(0.96 0.005 285)', overflowX: 'hidden', paddingBottom: '96px', boxShadow: '0 0 120px rgba(0,0,0,0.6)' }}>

        {/* ambient orbs */}
        <div style={{ position: 'fixed', top: '-12%', left: '-18%', width: '60%', height: '42%', borderRadius: '50%', background: 'radial-gradient(circle,oklch(0.6 0.2 5/0.42),transparent 68%)', filter: 'blur(48px)', animation: 'float1 16s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', bottom: '-8%', right: '-18%', width: '62%', height: '44%', borderRadius: '50%', background: 'radial-gradient(circle,oklch(0.58 0.2 290/0.4),transparent 68%)', filter: 'blur(52px)', animation: 'float2 19s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, opacity: 0.05, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

        {/* ── HOME ─────────────────────────────────────────────────────────── */}
        {isHome && (
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .55s ease both' }}>

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px' }}>
                <div style={{ fontFamily: serif, fontSize: '30px', letterSpacing: '0.5px', lineHeight: 1 }}>Encore</div>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', animation: 'pulse 2.4s ease-in-out infinite' }} />
              </div>
              <div onClick={this.goProfile} className="profile-btn" style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1.5px solid oklch(1 0 0/0.16)', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                {avatarSrc
                  ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'linear-gradient(135deg,oklch(0.62 0.18 5),oklch(0.55 0.18 290))' }} />
                }
              </div>
            </div>

            {/* search */}
            <div style={{ padding: '0 20px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '14px', background: 'oklch(0.2 0.014 285/0.6)', border: '1px solid oklch(1 0 0/0.07)', backdropFilter: 'blur(8px)' }}>
                <div style={{ width: '14px', height: '14px', border: '1.6px solid oklch(0.6 0.01 285)', borderRadius: '50%', position: 'relative', flex: 'none' }}>
                  <div style={{ position: 'absolute', width: '6px', height: '1.6px', background: 'oklch(0.6 0.01 285)', bottom: '-3px', right: '-3px', transform: 'rotate(45deg)' }} />
                </div>
                <div style={{ color: 'oklch(0.62 0.01 285)', fontSize: '14.5px' }}>Search artists, venues, cities…</div>
              </div>
            </div>

            {/* filter tabs */}
            <div style={{ display: 'flex', gap: '8px', padding: '2px 20px 18px', overflowX: 'auto' }}>
              <div style={{ flex: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff' }}>For you</div>
              {['This month', 'Near you', 'Following'].map(tab => (
                <div key={tab} style={{ flex: 'none', padding: '8px 16px', borderRadius: '999px', fontSize: '13px', fontWeight: 500, background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.07)', color: 'oklch(0.8 0.01 285)' }}>{tab}</div>
              ))}
            </div>

            {/* featured card */}
            {galleries.length > 0 && (() => {
              const g = galleries[0];
              const avs = [g.h1, g.h2, (g.h1 + 40) % 360, (g.h2 - 30 + 360) % 360];
              return (
                <div style={{ padding: '0 20px' }}>
                  <div onClick={() => this.openGallery(g.id)} className="gallery-card" style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '4/5', boxShadow: '0 18px 50px rgba(0,0,0,0.5)' }}>
                    <div style={{ position: 'absolute', inset: 0, animation: 'ken 16s ease-in-out infinite alternate', background: coverStr(g.h1, g.h2) }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.92) 4%,rgba(6,5,12,0.2) 48%,rgba(6,5,12,0.35) 100%)' }} />
                    <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 12px', borderRadius: '999px', background: 'rgba(10,8,16,0.55)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.12)' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'oklch(0.72 0.21 5)', animation: 'pulse 2s ease-in-out infinite' }} />
                      <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>Trending gallery</span>
                    </div>
                    <div style={{ position: 'absolute', left: '20px', right: '20px', bottom: '20px' }}>
                      <div style={{ fontFamily: serif, fontSize: '46px', lineHeight: 0.96, letterSpacing: '0.3px' }}>{g.artist}</div>
                      <div style={{ marginTop: '10px', fontSize: '14px', color: 'oklch(0.84 0.01 285)' }}>{g.venue + ' · ' + g.city}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px' }}>
                        <div style={{ display: 'flex' }}>
                          {avs.map((h, i) => (
                            <div key={i} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '2px solid #0a0810', marginLeft: i === 0 ? 0 : '-8px', background: avStr(h) }} />
                          ))}
                        </div>
                        <div style={{ fontSize: '13px', color: 'oklch(0.78 0.01 285)', fontWeight: 500 }}>{g.photoCount} photos · {g.videoCount} videos · {g.contribCount} fans</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* recent header */}
            <div style={{ padding: '30px 20px 8px', fontFamily: serif, fontSize: '22px', color: 'oklch(0.88 0.01 285)' }}>Recent galleries</div>

            {/* feed */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {galleries.slice(1).map(g => {
                const avs = [g.h1, g.h2, (g.h1 + 40) % 360];
                return (
                  <div key={g.id} onClick={() => this.openGallery(g.id)} className="feed-card" style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', cursor: 'pointer', aspectRatio: '16/11', animation: 'fadeUp .5s ease both', boxShadow: '0 12px 34px rgba(0,0,0,0.4)' }}>
                    <div className="feed-cover" style={{ position: 'absolute', inset: 0, background: coverStr(g.h1, g.h2) }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(6,5,12,0.9),rgba(6,5,12,0.05) 60%)' }} />
                    <div style={{ position: 'absolute', top: '14px', right: '14px', padding: '6px 11px', borderRadius: '999px', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.3px' }}>{g.month} {g.year}</div>
                    <div style={{ position: 'absolute', left: '18px', right: '18px', bottom: '16px' }}>
                      <div style={{ fontFamily: serif, fontSize: '30px', lineHeight: 1 }}>{g.artist}</div>
                      <div style={{ marginTop: '5px', fontSize: '13px', color: 'oklch(0.8 0.01 285)' }}>{g.venue + ' · ' + g.city}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                        <div style={{ display: 'flex' }}>
                          {avs.map((h, i) => (
                            <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #0a0810', marginLeft: i === 0 ? 0 : '-7px', background: avStr(h) }} />
                          ))}
                        </div>
                        <div style={{ fontSize: '12.5px', color: 'oklch(0.72 0.01 285)', fontWeight: 500 }}>{g.photoCount} photos · {g.videoCount} videos · {g.contribCount} fans</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GALLERY ──────────────────────────────────────────────────────── */}
        {isGallery && ag && (
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeIn .4s ease both' }}>

            {/* hero */}
            <div style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, animation: 'ken 16s ease-in-out infinite alternate', background: coverStr(ag.h1, ag.h2) }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#08070d 2%,rgba(8,7,13,0.15) 45%,rgba(8,7,13,0.45) 100%)' }} />
              <button onClick={this.goBack} style={{ position: 'absolute', top: '18px', left: '18px', width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(10,8,16,0.55)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', cursor: 'pointer' }}>‹</button>
              <div style={{ position: 'absolute', left: '22px', right: '22px', bottom: '22px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 11px', borderRadius: '999px', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '11px', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: '12px' }}>{ag.month} {ag.year}</div>
                <div style={{ fontFamily: serif, fontSize: '52px', lineHeight: 0.94, letterSpacing: '0.3px' }}>{ag.artist}</div>
                <div style={{ marginTop: '9px', fontSize: '15px', color: 'oklch(0.85 0.01 285)' }}>{ag.venue + ' · ' + ag.city}</div>
              </div>
            </div>

            {/* stats */}
            <div style={{ display: 'flex', padding: '18px 22px', borderBottom: '1px solid oklch(1 0 0/0.06)' }}>
              {[
                [curMedia.filter(m => m.type === 'photo').length, 'Photos'],
                [curMedia.filter(m => m.type === 'video').length, 'Videos'],
                [ag.contribCount, 'Fans'],
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
                {[ag.h1, ag.h2, (ag.h1 + 40) % 360, (ag.h2 - 30 + 360) % 360].map((h, i) => (
                  <div key={i} style={{ width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #08070d', marginLeft: i === 0 ? 0 : '-9px', background: avStr(h) }} />
                ))}
              </div>
              <div style={{ fontSize: '13px', color: 'oklch(0.74 0.01 285)' }}>You and {ag.contribCount - 1} others were here</div>
            </div>

            {/* add media */}
            <div style={{ padding: '8px 18px 18px' }}>
              <button onClick={this.addMedia} className="add-btn" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '14px', borderRadius: '14px', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff', fontSize: '14.5px', fontWeight: 600, boxShadow: '0 8px 24px oklch(0.64 0.2 320/0.32)', border: 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: '19px', fontWeight: 400, lineHeight: 0.7 }}>+</span> Add your photos &amp; videos
              </button>
            </div>

            {/* masonry grid */}
            <div style={{ padding: '0 18px', columnCount: 2, columnGap: '9px' }}>
              {curMedia.map((m, i) => (
                <div key={m.id} style={{ breakInside: 'avoid', marginBottom: '9px', position: 'relative', animationName: 'fadeUp', animationDuration: '.5s', animationTimingFunction: 'ease', animationFillMode: 'both', animationDelay: (i * 0.045) + 's' }}>
                  <div onClick={() => this.openLb(i)} className="media-item" style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', border: '1px solid oklch(1 0 0/0.05)', aspectRatio: String(m.ratio), background: tileStr(m.h1, m.h2, m.L) }}>
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
                    <button onClick={() => this.delMedia(m.id)} className="delete-btn" style={{ position: 'absolute', top: '8px', right: '8px', padding: '4px 10px', borderRadius: '999px', background: 'rgba(10,8,16,0.62)', backdropFilter: 'blur(6px)', border: '1px solid oklch(1 0 0/0.14)', fontSize: '11px', fontWeight: 600, color: 'oklch(0.85 0.08 25)', cursor: 'pointer' }}>Delete</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CREATE ───────────────────────────────────────────────────────── */}
        {isCreate && (
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease both', padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <button onClick={this.goBack} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
              <div style={{ fontSize: '12px', letterSpacing: '1.4px', textTransform: 'uppercase', color: 'oklch(0.6 0.01 285)' }}>Public gallery</div>
            </div>
            <div style={{ fontFamily: serif, fontSize: '38px', lineHeight: 1.02, marginTop: '8px' }}>Start a gallery</div>
            <div style={{ fontSize: '14px', color: 'oklch(0.7 0.01 285)', marginTop: '8px', lineHeight: 1.5 }}>Create a shared space for a show you attended. Anyone there can add their own photos and videos too.</div>

            {/* live preview card */}
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
                { label: 'ARTIST NAME', key: 'artist', handler: this.setArtist, placeholder: 'e.g. Beach House' },
                { label: 'VENUE',       key: 'venue',  handler: this.setVenue,  placeholder: 'e.g. The Fillmore' },
                { label: 'CITY',        key: 'city',   handler: this.setCity,   placeholder: 'e.g. San Francisco' },
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
                    <select value={create.month} onChange={this.setMonth} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', appearance: 'none', WebkitAppearance: 'none', boxSizing: 'border-box', outline: 'none' }}>
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
                    <select value={create.year} onChange={this.setYear} style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', appearance: 'none', WebkitAppearance: 'none', boxSizing: 'border-box', outline: 'none' }}>
                      {['2026','2025','2024','2023'].map(y => (
                        <option key={y} value={y} style={{ color: '#000' }}>{y}</option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '6px solid oklch(0.65 0.01 285)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={this.createSubmit} className="create-gallery-btn" style={{ width: '100%', marginTop: '26px', padding: '16px', borderRadius: '14px', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff', fontSize: '15.5px', fontWeight: 700, boxShadow: '0 10px 30px oklch(0.64 0.2 320/0.35)', border: 'none', cursor: 'pointer', display: 'block' }}>Create gallery</button>
            <div style={{ textAlign: 'center', fontSize: '12.5px', color: 'oklch(0.55 0.01 285)', marginTop: '12px' }}>Public · anyone can view and contribute</div>
          </div>
        )}

        {/* ── PROFILE ──────────────────────────────────────────────────────── */}
        {isProfile && (
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease both' }}>

            {/* banner */}
            <div style={{ position: 'relative', height: '150px', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, animation: 'ken 16s ease-in-out infinite alternate', background: coverStr(330, 285) }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(8,7,13,0.2),#08070d)' }} />
              <button onClick={this.goBack} style={{ position: 'absolute', top: '18px', left: '18px', width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(8px)', border: '1px solid oklch(1 0 0/0.12)', fontSize: '18px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
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
                          navigator.clipboard.writeText(`https://encore.app/@${profile.username}`);
                          this.flash('Link copied!');
                        }}
                        style={{ fontSize: '10.5px', color: 'oklch(0.55 0.01 285)', background: 'oklch(0.2 0.014 285/0.5)', border: '1px solid oklch(1 0 0/0.08)', borderRadius: '6px', padding: '2px 7px', cursor: 'pointer', letterSpacing: '0.3px' }}
                      >
                        Copy link
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={this.goEditProfile} className="edit-btn" style={{ padding: '9px 18px', borderRadius: '999px', border: '1px solid oklch(1 0 0/0.14)', background: 'oklch(0.2 0.014 285/0.7)', fontSize: '13px', fontWeight: 600, color: 'oklch(0.96 0.005 285)', cursor: 'pointer' }}>Edit</button>
                  <button onClick={this.handleSignOut} style={{ padding: '9px 14px', borderRadius: '999px', border: '1px solid oklch(1 0 0/0.1)', background: 'none', fontSize: '13px', color: 'oklch(0.55 0.01 285)', cursor: 'pointer' }}>Out</button>
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

            {/* concerts attended list */}
            <div style={{ padding: '28px 22px 8px', fontFamily: serif, fontSize: '22px', color: 'oklch(0.9 0.01 285)' }}>Concerts attended</div>
            <div style={{ padding: '0 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {galleries.map((g, idx) => (
                <div key={g.id} onClick={() => this.openGallery(g.id)} className="concert-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px', borderRadius: '14px', background: 'oklch(0.17 0.013 285/0.5)', border: '1px solid oklch(1 0 0/0.06)', cursor: 'pointer', animation: 'fadeUp .45s ease both' }}>
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
        )}

        {/* ── LIGHTBOX ─────────────────────────────────────────────────────── */}
        {hasLb && lbMedia && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(5,4,9,0.94)', backdropFilter: 'blur(14px)', animation: 'fadeIn .3s ease both', display: 'flex', flexDirection: 'column', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px' }}>
              <div style={{ fontSize: '13px', color: 'oklch(0.7 0.01 285)' }}>{ag && ag.artist + ' — ' + ag.city}</div>
              <button onClick={this.closeLb} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.12)', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', position: 'relative' }}>
              <button onClick={this.prevLb} style={{ position: 'absolute', left: '18px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(20,16,28,0.6)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '22px', color: '#fff', zIndex: 2, cursor: 'pointer' }}>‹</button>
              <div style={{ position: 'relative', width: '100%', maxHeight: '72vh', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', animation: 'scaleIn .35s ease both', background: tileStr(lbMedia.h1, lbMedia.h2, lbMedia.L) }}>
                {lbMedia.type === 'video' && (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '62px', height: '62px', borderRadius: '50%', background: 'rgba(10,8,16,0.5)', backdropFilter: 'blur(6px)', border: '2px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 0, height: 0, borderLeft: '18px solid #fff', borderTop: '11px solid transparent', borderBottom: '11px solid transparent', marginLeft: '4px' }} />
                  </div>
                )}
              </div>
              <button onClick={this.nextLb} style={{ position: 'absolute', right: '18px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(20,16,28,0.6)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '22px', color: '#fff', zIndex: 2, cursor: 'pointer' }}>›</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: avStr(lbMedia.ownerH) }} />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>{lbMedia.ownerName === 'you' ? 'you' : '@' + lbMedia.ownerName}</div>
                  <div style={{ fontSize: '11.5px', color: 'oklch(0.58 0.01 285)' }}>{(lbMedia.type === 'video' ? 'Video' : 'Photo') + ' · ' + (ag ? ag.artist : '')}</div>
                </div>
              </div>
              {lbMedia.isOwn && (
                <button onClick={() => this.delMedia(lbMedia.id)} style={{ padding: '9px 16px', borderRadius: '999px', background: 'oklch(0.3 0.13 25/0.4)', border: '1px solid oklch(0.5 0.13 25/0.4)', fontSize: '13px', fontWeight: 600, color: 'oklch(0.82 0.1 25)', cursor: 'pointer' }}>Delete</button>
              )}
            </div>
          </div>
        )}

        {/* ── EDIT PROFILE ─────────────────────────────────────────────────── */}
        {isEditProfile && (
          <div style={{ position: 'relative', zIndex: 1, animation: 'fadeUp .4s ease both', padding: '22px 20px 40px' }}>

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
              <button onClick={() => this.setState({ screen: 'profile' })} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'oklch(0.2 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.1)', fontSize: '18px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>‹</button>
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
                  <input type="file" accept="image/*" onChange={this.handleAvatarChange} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {[
                { label: 'NAME',     key: 'name',     type: 'text',  placeholder: 'Your display name' },
                { label: 'LOCATION', key: 'location', type: 'text',  placeholder: 'e.g. Austin, TX' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>{label}</label>
                  <input
                    type={type}
                    value={profile[key]}
                    onChange={this.setProfileField(key)}
                    placeholder={placeholder}
                    style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block' }}
                  />
                </div>
              ))}

              {/* username @handle */}
              {(() => {
                const uBorder = usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? '1px solid oklch(0.52 0.18 25/0.7)'
                  : usernameStatus === 'available'
                  ? '1px solid oklch(0.56 0.16 145/0.6)'
                  : '1px solid oklch(1 0 0/0.09)';
                return (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>USERNAME</label>
                    <div style={{ position: 'relative', marginTop: '7px' }}>
                      <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: 'oklch(0.52 0.01 285)', pointerEvents: 'none', userSelect: 'none' }}>@</div>
                      <input
                        type="text"
                        value={profile.username}
                        onChange={this.handleUsernameChange}
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
                    {usernameStatus === 'taken' && (
                      <div style={{ fontSize: '11.5px', color: 'oklch(0.65 0.18 25)', marginTop: '5px' }}>That username is already taken</div>
                    )}
                    {usernameStatus === 'available' && profile.username !== this._storedUsername && (
                      <div style={{ fontSize: '11.5px', color: 'oklch(0.68 0.15 145)', marginTop: '5px' }}>Available</div>
                    )}
                    {(usernameStatus === 'invalid' || usernameStatus === 'short') && (
                      <div style={{ fontSize: '11.5px', color: 'oklch(0.65 0.18 25)', marginTop: '5px' }}>3–20 chars · letters, numbers, _ or . · start and end with a letter or number</div>
                    )}
                    {!profile.username && usernameStatus === 'idle' && (
                      <div style={{ fontSize: '11.5px', color: 'oklch(0.45 0.01 285)', marginTop: '5px' }}>Sets your profile URL: encore.app/@yourhandle</div>
                    )}
                  </div>
                );
              })()}

              {/* website URL + label pair */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>LINK</label>
                <input
                  type="url"
                  value={profile.website}
                  onChange={this.setProfileField('website')}
                  placeholder="https://yoursite.com"
                  style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px 12px 0 0', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', borderBottom: '1px solid oklch(1 0 0/0.04)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block' }}
                />
                <input
                  type="text"
                  value={profile.websiteLabel}
                  onChange={this.setProfileField('websiteLabel')}
                  placeholder="Label (e.g. Instagram, Portfolio)"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '0 0 12px 12px', background: 'oklch(0.15 0.012 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', borderTop: 'none', fontSize: '13.5px', color: 'oklch(0.88 0.005 285)', boxSizing: 'border-box', outline: 'none', display: 'block' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: 'oklch(0.55 0.01 285)' }}>BIO</label>
                <textarea
                  value={profile.bio}
                  onChange={this.setProfileField('bio')}
                  placeholder="Tell the crowd who you are…"
                  rows={4}
                  style={{ width: '100%', marginTop: '7px', padding: '14px 16px', borderRadius: '12px', background: 'oklch(0.18 0.014 285/0.7)', border: '1px solid oklch(1 0 0/0.09)', fontSize: '15px', color: '#fff', boxSizing: 'border-box', outline: 'none', display: 'block', resize: 'none', lineHeight: 1.55 }}
                />
              </div>
            </div>

            {/* save */}
            <button
              onClick={this.saveProfile}
              disabled={editLoading}
              style={{ width: '100%', marginTop: '28px', padding: '16px', borderRadius: '14px', background: editLoading ? 'oklch(0.4 0.08 285)' : 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', color: '#fff', fontSize: '15.5px', fontWeight: 700, boxShadow: editLoading ? 'none' : '0 10px 30px oklch(0.64 0.2 320/0.35)', border: 'none', cursor: editLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
            >
              {editLoading && <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />}
              {editLoading ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        )}

        {/* ── LOGIN MODAL ──────────────────────────────────────────────────── */}
        {loginModal && (
          <div onClick={this.closeLoginModal} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(5,4,9,0.78)', backdropFilter: 'blur(18px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', maxWidth: '480px', margin: '0 auto', animation: 'fadeIn .25s ease both' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '32px 24px 44px', borderRadius: '28px 28px 0 0', background: 'linear-gradient(180deg, oklch(0.16 0.018 285), oklch(0.12 0.014 285))', border: '1px solid oklch(1 0 0/0.1)', borderBottom: 'none', boxShadow: '0 -24px 60px rgba(0,0,0,0.6)', animation: 'fadeUp .3s ease both' }}>

              {/* close pill */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
                <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'oklch(1 0 0/0.15)' }} />
              </div>

              {/* wordmark */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: '34px', letterSpacing: '0.5px', lineHeight: 1 }}>Encore</div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', animation: 'pulse 2.4s ease-in-out infinite' }} />
              </div>
              <div style={{ fontSize: '15px', color: 'oklch(0.68 0.01 285)', lineHeight: 1.5, marginBottom: '32px' }}>Save your shots, see who else was there, and revisit every show.</div>

              {/* Google button */}
              <button
                onClick={this.handleGoogleSignIn}
                disabled={loginLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '15px 20px', borderRadius: '14px', background: loginLoading ? 'oklch(0.88 0 0)' : '#fff', border: 'none', cursor: loginLoading ? 'default' : 'pointer', fontSize: '15px', fontWeight: 600, color: '#1f1f1f', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', transition: 'opacity .15s ease', opacity: loginLoading ? 0.7 : 1 }}
              >
                {loginLoading ? (
                  <div style={{ width: '20px', height: '20px', border: '2px solid #ccc', borderTopColor: '#555', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#4285F4" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
                    <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.7 15.8 19 13 24 13c3.1 0 5.8 1.1 7.9 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
                    <path fill="#FBBC05" d="M24 44c5.2 0 9.9-1.8 13.5-4.8l-6.2-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.2 0-9.7-3.3-11.3-8l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
                    <path fill="#EA4335" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l6.2 5.2C41.6 36.2 44 30.5 44 24c0-1.3-.1-2.6-.4-3.9z"/>
                  </svg>
                )}
                {loginLoading ? 'Signing in…' : 'Continue with Google'}
              </button>

              <div style={{ textAlign: 'center', fontSize: '12px', color: 'oklch(0.48 0.01 285)', marginTop: '16px', lineHeight: 1.5 }}>By continuing you agree to our terms. We only use your account to identify you.</div>
            </div>
          </div>
        )}

        {/* ── TOAST ────────────────────────────────────────────────────────── */}
        {toast && (
          <div style={{ position: 'fixed', bottom: '108px', left: '50%', transform: 'translateX(-50%)', zIndex: 90, padding: '12px 20px', borderRadius: '999px', background: 'oklch(0.24 0.015 285/0.95)', backdropFilter: 'blur(10px)', border: '1px solid oklch(1 0 0/0.12)', fontSize: '13.5px', fontWeight: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'pop .4s ease both', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        {/* ── BOTTOM NAV ───────────────────────────────────────────────────── */}
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', zIndex: 70, padding: '0 22px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderRadius: '22px', background: 'rgba(14,11,20,0.82)', backdropFilter: 'blur(20px)', border: '1px solid oklch(1 0 0/0.09)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
            <button onClick={this.goHome} style={isHome ? navOn : navOff}>
              <div style={{ width: '20px', height: '18px', position: 'relative' }}>
                <div style={{ position: 'absolute', bottom: 0, width: '18px', height: '11px', border: '2px solid currentColor', borderTop: 'none', borderRadius: '0 0 3px 3px' }} />
                <div style={{ position: 'absolute', top: 0, left: '1px', width: 0, height: 0, borderLeft: '9px solid transparent', borderRight: '9px solid transparent', borderBottom: '8px solid currentColor' }} />
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.3px' }}>Home</span>
            </button>
            <button onClick={this.goCreate} className="nav-plus" style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(120deg,oklch(0.7 0.2 5),oklch(0.64 0.2 290))', boxShadow: '0 8px 24px oklch(0.64 0.2 320/0.4)', marginTop: '-24px', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontSize: '28px', fontWeight: 300, color: '#fff', lineHeight: 0.6 }}>+</span>
            </button>
            <button onClick={this.goProfile} style={isProfile ? navOn : navOff}>
              <div style={{ width: '18px', height: '18px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: '5px', width: '8px', height: '8px', borderRadius: '50%', border: '2px solid currentColor' }} />
                <div style={{ position: 'absolute', bottom: 0, width: '18px', height: '8px', border: '2px solid currentColor', borderBottom: 'none', borderRadius: '9px 9px 0 0' }} />
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.3px' }}>You</span>
            </button>
          </div>
        </div>

      </div>
    );
  }
}

export default App;
