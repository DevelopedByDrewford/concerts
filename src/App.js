import React from 'react';
import './App.css';
import { auth, signInWithGoogle, getGoogleRedirectResult, signOutUser, loadUserProfile, saveUserProfile, uploadAvatar, checkUsernameAvailable, callChangeUsername, getUserByUsername, getFollowStatus, followUser, unfollowUser, getFollowCounts, getFollowersList, getFollowingList } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { INITIAL_GALLERIES } from './utils/galleryData';
import HomeContainer        from './containers/HomeContainer';
import ConcertContainer     from './containers/ConcertContainer';
import UserProfileContainer from './containers/UserProfileContainer';
import FollowListContainer  from './containers/FollowListContainer';
import Lightbox   from './components/Lightbox';
import LoginModal from './components/LoginModal';
import Toast      from './components/Toast';
import NavBar     from './components/NavBar';

class App extends React.Component {
  state = {
    screen:          'home',
    activeId:        null,
    lb:              null,
    slide:           0,
    deleted:         {},
    extra:           {},
    toast:           '',
    galleries:       INITIAL_GALLERIES,
    create:          { artist: '', venue: '', city: '', month: 'Sep', year: '2025' },
    user:            null,
    loginModal:      false,
    loginLoading:    false,
    profile:         { name: '', username: '', bio: '', location: '', website: '', websiteLabel: '', avatarUrl: null },
    editLoading:     false,
    avatarUploading: false,
    usernameStatus:  'idle',
    publicUid:         null,
    publicProfile:     null,
    followStatus:      null,   // null | 'loading' | 'following' | 'not-following'
    followerCount:     null,
    followingCount:    null,
    followListType:    null,   // 'followers' | 'following'
    followList:        [],
    followListLoading: false,
  };

  _storedUsername = '';
  _usernameTimer  = null;

  componentDidMount() {
    this._iv = setInterval(() => {
      if (this.state.screen === 'profile') this.setState(s => ({ slide: s.slide + 1 }));
    }, 4500);

    window.addEventListener('popstate', this._handlePopState);
    this._loadFromUrl(window.location.pathname);

    // Pick up the result after a mobile redirect sign-in
    getGoogleRedirectResult()
      .then(result => {
        if (result?.user) {
          this.setState({ loginModal: false, screen: 'profile', slide: 0, lb: null, publicUid: null, publicProfile: null });
          const username = this._storedUsername;
          if (username) this._pushUrl(`/@${username}`);
        }
      })
      .catch(() => {});

    this._unsubAuth = onAuthStateChanged(auth, async user => {
      if (user) {
        const stored    = await loadUserProfile(user.uid);
        const rawStored = stored?.username || '';
        const isLegacy  = /\s/.test(rawStored) || rawStored !== rawStored.toLowerCase();
        const handle    = isLegacy ? '' : rawStored;
        this._storedUsername = handle;
        this.setState({
          user,
          profile: {
            name:         stored?.name         || (isLegacy ? rawStored : '') || user.displayName || '',
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
    window.removeEventListener('popstate', this._handlePopState);
  }

  flash = (msg) => {
    this.setState({ toast: msg });
    if (this._tt) clearTimeout(this._tt);
    this._tt = setTimeout(() => this.setState({ toast: '' }), 1900);
  };

  // ── URL routing ──────────────────────────────────────────────────────────────
  _pushUrl = (path) => window.history.pushState(null, '', path);

  _handlePopState = () => this._loadFromUrl(window.location.pathname);

  _loadFromUrl(path) {
    const match = path.match(/^\/@([a-z0-9._]{3,20})$/i);
    if (match) {
      this._openUsernameProfile(match[1].toLowerCase());
    } else {
      // Any other path → home
      if (path !== '/') window.history.replaceState(null, '', '/');
      this.setState({ screen: 'home', lb: null, publicUid: null, publicProfile: null });
    }
  }

  _openUsernameProfile = async (username) => {
    try {
      const data = await getUserByUsername(username);
      if (!data) { window.history.replaceState(null, '', '/'); this.flash('Profile not found'); return; }
      if (data.redirectTo) {
        // Old username — follow the redirect
        window.history.replaceState(null, '', `/@${data.redirectTo}`);
        return this._openUsernameProfile(data.redirectTo);
      }
      this.setState({
        screen:        'profile',
        lb:            null,
        slide:         0,
        publicUid:     data.uid,
        publicProfile: {
          name:         data.name         || '',
          username:     data.username     || username,
          bio:          data.bio          || '',
          location:     data.location     || '',
          website:      data.website      || '',
          websiteLabel: data.websiteLabel || '',
          avatarUrl:    data.profilePhotoUrl || null,
        },
      }, () => this._loadFollowData(data.uid));
    } catch {
      window.history.replaceState(null, '', '/');
    }
  };

  // ── navigation ───────────────────────────────────────────────────────────────
  goHome = () => {
    this._pushUrl('/');
    this.setState({ screen: 'home', lb: null, publicUid: null, publicProfile: null });
  };
  goCreate  = () => this.setState({ screen: 'create', lb: null });
  goBack    = () => {
    this._pushUrl('/');
    this.setState({ screen: 'home', lb: null, publicUid: null, publicProfile: null });
  };
  goProfile = () => {
    if (!this.state.user) { this.setState({ loginModal: true }); return; }
    const username = this.state.profile.username || this._storedUsername;
    this._pushUrl(username ? `/@${username}` : '/');
    this.setState(
      { screen: 'profile', lb: null, slide: 0, publicUid: null, publicProfile: null },
      () => { if (this.state.user) this._loadFollowData(this.state.user.uid); }
    );
  };
  goEditProfile = () => this.setState({ screen: 'editProfile', lb: null });
  setScreen     = (s) => this.setState({ screen: s });

  // ── follow ───────────────────────────────────────────────────────────────────
  _loadFollowData = async (targetUid) => {
    const { user } = this.state;
    const isSelf = user?.uid === targetUid;
    this.setState({ followStatus: isSelf ? null : 'loading', followerCount: null, followingCount: null });
    try {
      const [counts, isFollowing] = await Promise.all([
        getFollowCounts(targetUid),
        (!isSelf && user) ? getFollowStatus(user.uid, targetUid) : Promise.resolve(null),
      ]);
      this.setState({
        followerCount:  counts.followerCount,
        followingCount: counts.followingCount,
        followStatus:   isFollowing === null ? null : (isFollowing ? 'following' : 'not-following'),
      });
    } catch {
      this.setState({ followStatus: null, followerCount: 0, followingCount: 0 });
    }
  };

  handleFollow = async () => {
    const { user, publicUid } = this.state;
    if (!user || !publicUid) return;
    this.setState({ followStatus: 'loading' });
    try {
      await followUser(user.uid, publicUid);
      this.setState(s => ({ followStatus: 'following', followerCount: (s.followerCount ?? 0) + 1 }));
    } catch {
      this.flash('Could not follow — try again');
      this.setState({ followStatus: 'not-following' });
    }
  };

  handleUnfollow = async () => {
    const { user, publicUid } = this.state;
    if (!user || !publicUid) return;
    this.setState({ followStatus: 'loading' });
    try {
      await unfollowUser(user.uid, publicUid);
      this.setState(s => ({ followStatus: 'not-following', followerCount: Math.max(0, (s.followerCount ?? 1) - 1) }));
    } catch {
      this.flash('Could not unfollow — try again');
      this.setState({ followStatus: 'following' });
    }
  };

  openFollowList = async (type) => {
    const { publicUid, user } = this.state;
    const targetUid = publicUid || user?.uid;
    if (!targetUid) return;
    this.setState({ screen: 'followList', followListType: type, followList: [], followListLoading: true });
    try {
      const list = type === 'followers'
        ? await getFollowersList(targetUid)
        : await getFollowingList(targetUid);
      this.setState({ followList: list, followListLoading: false });
    } catch {
      this.setState({ followListLoading: false });
      this.flash('Failed to load list');
    }
  };

  closeFollowList = () => this.setState({ screen: 'profile' });

  openProfileFromList = (username) => {
    if (!username) return;
    this._pushUrl(`/@${username}`);
    this._openUsernameProfile(username);
  };

  // ── auth ─────────────────────────────────────────────────────────────────────
  openLoginModal  = () => this.setState({ loginModal: true });
  closeLoginModal = () => this.setState({ loginModal: false, loginLoading: false });

  handleGoogleSignIn = async () => {
    this.setState({ loginLoading: true });
    try {
      await signInWithGoogle();
      this.setState({ loginModal: false, loginLoading: false, screen: 'profile', slide: 0, lb: null });
    } catch {
      this.setState({ loginLoading: false });
    }
  };

  handleSignOut = async () => {
    await signOutUser();
    this.setState({ screen: 'home', user: null });
    this.flash('Signed out');
  };

  // ── profile ──────────────────────────────────────────────────────────────────
  setProfileField = (k) => (e) => {
    this.setState(s => ({ profile: { ...s.profile, [k]: e.target.value } }));
  };

  handleUsernameChange = (e) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '');
    this.setState(s => ({ profile: { ...s.profile, username: val }, usernameStatus: 'idle' }));

    if (this._usernameTimer) clearTimeout(this._usernameTimer);
    if (!val) return;

    if (val === this._storedUsername) { this.setState({ usernameStatus: 'available' }); return; }

    const validFormat = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$|^[a-z0-9]{3}$/.test(val)
      && !/\.{2}|_{2}/.test(val);

    if (val.length < 3)  { this.setState({ usernameStatus: 'short' });   return; }
    if (!validFormat)     { this.setState({ usernameStatus: 'invalid' }); return; }

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

    if (usernameStatus === 'checking') { this.flash('Still checking username — wait a moment'); return; }
    if (usernameStatus === 'taken')    { this.flash('Username is already taken'); return; }
    if (usernameStatus === 'invalid' || usernameStatus === 'short') { this.flash('Username format is invalid'); return; }

    this.setState({ editLoading: true });
    try {
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
      const finalUsername = profile.username || this._storedUsername;
      this._pushUrl(finalUsername ? `/@${finalUsername}` : '/');
      this.setState({ editLoading: false, screen: 'profile', slide: 0, usernameStatus: 'idle', publicUid: null, publicProfile: null });
      this.flash('Profile saved');
    } catch (err) {
      this.setState({ editLoading: false });
      const isConflict = err?.code === 'functions/already-exists' || err?.message?.includes('already taken');
      this.flash(isConflict ? 'Username already taken — choose another' : 'Save failed — try again');
    }
  };

  // ── gallery / media ──────────────────────────────────────────────────────────
  openGallery = (id) => {
    this.setState({ screen: 'gallery', activeId: id, lb: null });
    window.scrollTo(0, 0);
  };

  openLb  = (i) => this.setState({ lb: i });
  closeLb = () => this.setState({ lb: null });

  nextLb = () => {
    const { galleries, activeId, deleted, extra, lb } = this.state;
    const ag = galleries.find(g => g.id === activeId);
    if (!ag) return;
    const cm = (extra[ag.id] || []).concat(ag.media.filter(m => !deleted[m.id]));
    this.setState({ lb: (lb + 1) % cm.length });
  };

  prevLb = () => {
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

  // ── create form ──────────────────────────────────────────────────────────────
  setF      = (k) => (e) => this.setState(s => ({ create: { ...s.create, [k]: e.target.value } }));
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
      venue:  c.venue  || 'Venue',
      city:   c.city   || 'City',
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
      screen:    'gallery',
      activeId:  g.id,
      create:    { artist: '', venue: '', city: '', month: 'Sep', year: '2025' },
    }));
    window.scrollTo(0, 0);
    this.flash('Gallery created — invite your friends');
  };

  // ── render ───────────────────────────────────────────────────────────────────
  render() {
    const { screen, activeId, lb, slide, deleted, extra, toast, galleries, create, user, loginModal, loginLoading, profile, editLoading, avatarUploading, usernameStatus, publicUid, publicProfile, followStatus, followerCount, followingCount, followListType, followList, followListLoading } = this.state;

    const isHome        = screen === 'home';
    const isConcert     = screen === 'gallery' || screen === 'create';
    const isUserProfile = screen === 'profile'  || screen === 'editProfile';
    const isFollowList  = screen === 'followList';

    const isOwnProfile   = !publicUid || publicUid === user?.uid;
    const displayProfile = (!isOwnProfile && publicProfile) ? publicProfile : profile;

    const ag = galleries.find(g => g.id === activeId);
    const curMedia = ag
      ? (extra[ag.id] || []).concat(ag.media.filter(m => !deleted[m.id]))
      : [];

    return (
      <div className="app-shell">
        <div className="app-orb-1" />
        <div className="app-orb-2" />
        <div className="app-grain" />

        {isHome && (
          <HomeContainer
            galleries={galleries}
            user={user}
            profile={profile}
            onOpenGallery={this.openGallery}
            onGoProfile={this.goProfile}
          />
        )}

        {isConcert && (
          <ConcertContainer
            screen={screen}
            gallery={ag}
            curMedia={curMedia}
            create={create}
            onGoBack={this.goBack}
            onOpenLb={this.openLb}
            onAddMedia={this.addMedia}
            onDelMedia={this.delMedia}
            onSetArtist={this.setArtist}
            onSetVenue={this.setVenue}
            onSetCity={this.setCity}
            onSetMonth={this.setMonth}
            onSetYear={this.setYear}
            onCreateSubmit={this.createSubmit}
          />
        )}

        {isUserProfile && (
          <UserProfileContainer
            screen={screen}
            user={user}
            profile={displayProfile}
            galleries={isOwnProfile ? galleries : []}
            isOwn={isOwnProfile}
            slide={slide}
            followStatus={followStatus}
            followerCount={followerCount}
            followingCount={followingCount}
            usernameStatus={usernameStatus}
            storedUsername={this._storedUsername}
            editLoading={editLoading}
            avatarUploading={avatarUploading}
            onGoBack={this.openGallery}
            onGoEditProfile={this.goEditProfile}
            onSetScreen={this.setScreen}
            onSignOut={this.handleSignOut}
            onSetProfileField={this.setProfileField}
            onUsernameChange={this.handleUsernameChange}
            onAvatarChange={this.handleAvatarChange}
            onSaveProfile={this.saveProfile}
            onFollow={this.handleFollow}
            onUnfollow={this.handleUnfollow}
            onOpenFollowList={this.openFollowList}
            onFlash={this.flash}
          />
        )}

        {isFollowList && (
          <FollowListContainer
            type={followListType}
            list={followList}
            loading={followListLoading}
            onBack={this.closeFollowList}
            onOpenProfile={this.openProfileFromList}
          />
        )}

        {lb != null && curMedia[lb] && (
          <Lightbox
            media={curMedia[lb]}
            gallery={ag}
            onClose={this.closeLb}
            onPrev={this.prevLb}
            onNext={this.nextLb}
            onDelete={this.delMedia}
          />
        )}

        {loginModal && (
          <LoginModal
            loading={loginLoading}
            onSignIn={this.handleGoogleSignIn}
            onClose={this.closeLoginModal}
          />
        )}

        <Toast message={toast} />

        <NavBar
          screen={screen}
          onHome={this.goHome}
          onCreate={this.goCreate}
          onProfile={this.goProfile}
        />
      </div>
    );
  }
}

export default App;
