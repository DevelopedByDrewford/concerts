import React from 'react';
import './App.css';
import { auth, signInWithGoogle, signOutUser, loadUserProfile, saveUserProfile, uploadAvatar, uploadBanner, checkUsernameAvailable, callChangeUsername, getUserByUsername, getFollowStatus, followUser, unfollowUser, getFollowCounts, getFollowersList, getFollowingList, searchUsers, searchGalleries, getUserGalleries, findDuplicateGallery, createGallery, uploadToStaging, watchUploadJob, loadGalleryItems, callDeleteItem, callGetVideoUrl } from './firebase';
import { uidToHue } from './utils/colorHelpers';
import { onAuthStateChanged } from 'firebase/auth';
import { INITIAL_GALLERIES } from './utils/galleryData';
import HomeContainer        from './containers/HomeContainer';
import ConcertContainer     from './containers/ConcertContainer';
import UserProfileContainer from './containers/UserProfileContainer';
import FollowListContainer      from './containers/FollowListContainer';
import SearchResultsContainer  from './containers/SearchResultsContainer';
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
    loginError:      null,
    profile:         { name: '', username: '', bio: '', location: '', website: '', websiteLabel: '', avatarUrl: null, bannerUrl: null, nameFont: '' },
    editLoading:     false,
    avatarUploading:  false,
    bannerUploading:  false,
    usernameStatus:  'idle',
    publicUid:         null,
    publicProfile:     null,
    followStatus:      null,   // null | 'loading' | 'following' | 'not-following'
    followerCount:     null,
    followingCount:    null,
    followListType:    null,   // 'followers' | 'following'
    followList:        [],
    followListLoading: false,
    searchQuery:       '',
    searchResults:     null,
    searchLoading:     false,
    duplicateGallery:     null,
    createLoading:        false,
    userGalleries:        [],
    galleryItems:         {},   // { [galleryId]: ItemDoc[] }
    uploads:              {},   // { [fileId]: upload descriptor }
    publicProfileLoading: false,
    galleryLoading:       false,
  };

  _storedUsername = '';
  _usernameTimer  = null;
  _fromUrl        = '/';
  _jobUnsubs      = {};   // fileId → unsubscribe fn for uploadJobs onSnapshot

  _slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  _galleryPath = (g) => {
    const s = this._slugify;
    return `/g/${s(g.artist)}/${s(g.venue)}/${s(g.city)}/${s(g.month)}-${s(g.year)}`;
  };

  _allGalleries = () => {
    const { userGalleries, galleries } = this.state;
    return [...userGalleries, ...galleries.filter(g => !userGalleries.find(u => u.id === g.id))];
  };

  _firestoreGalleryToLocal(doc) {
    const [month = '', year = ''] = (doc.monthYear || '').split(' ');
    // deterministic hues from doc ID so color is stable across sessions
    let h1 = 0;
    for (let i = 0; i < doc.id.length; i++) h1 = (h1 + doc.id.charCodeAt(i)) % 360;
    const h2 = (h1 + 55) % 360;
    return {
      id: doc.id, artist: doc.artistName || '', venue: doc.venue || '',
      city: doc.city || '', month, year, h1, h2,
      media: [], photoCount: 0, videoCount: 0, contribCount: 1, ownCount: 0,
    };
  }

  componentDidMount() {
    this._iv = setInterval(() => {
      if (this.state.screen === 'profile') this.setState(s => ({ slide: s.slide + 1 }));
    }, 4500);

    window.addEventListener('popstate', this._handlePopState);
    this._loadFromUrl(window.location.pathname);

    this._unsubAuth = onAuthStateChanged(auth, async user => {
      if (user) {
        const [stored, rawDocs] = await Promise.all([
          loadUserProfile(user.uid),
          getUserGalleries(user.uid),
        ]);
        const rawStored = stored?.username || '';
        const isLegacy  = /\s/.test(rawStored) || rawStored !== rawStored.toLowerCase();
        const handle    = isLegacy ? '' : rawStored;
        this._storedUsername = handle;
        const userGalleries = rawDocs.map(d => this._firestoreGalleryToLocal(d));
        let galleryNotFound = false;
        if (this._pendingGalleryPath) {
          const path = this._pendingGalleryPath;
          this._pendingGalleryPath = null;
          const allG = [...userGalleries, ...this.state.galleries.filter(g => !userGalleries.find(u => u.id === g.id))];
          const found = allG.find(g => this._galleryPath(g) === path);
          if (found) {
            this.setState({ user, userGalleries, screen: 'gallery', activeId: found.id, galleryLoading: false, lb: null });
            loadGalleryItems(found.id)
              .then(items => this.setState(s => ({ galleryItems: { ...s.galleryItems, [found.id]: items } })))
              .catch(() => {});
            return;
          }
          window.history.replaceState(null, '', '/');
          galleryNotFound = true;
        }
        this.setState(s => ({
          user,
          userGalleries,
          ...(galleryNotFound ? { screen: 'home', galleryLoading: false } : {}),
          profile: {
            name:         stored?.name         || (isLegacy ? rawStored : '') || user.displayName || '',
            username:     handle,
            bio:          stored?.bio           || '',
            location:     stored?.location      || '',
            website:      stored?.website       || '',
            websiteLabel: stored?.websiteLabel  || '',
            avatarUrl:    stored?.profilePhotoUrl || null,
            bannerUrl:    stored?.bannerUrl        || null,
            nameFont:     stored?.nameFont         || '',
          },
          // On WKWebView (Chrome/Brave iOS), signInWithPopup opens a new tab instead of
          // a true popup — window.opener is null so Firebase can't postMessage the result
          // back, leaving the promise permanently hung. Auth still completes via IndexedDB.
          // If the modal is still open when we receive a user, close it here.
          ...(s.loginModal ? { loginModal: false, loginLoading: false, loginError: null, screen: 'profile', slide: 0, lb: null } : {}),
        }));
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
    Object.values(this._jobUnsubs).forEach(unsub => unsub());
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
    const profileMatch = path.match(/^\/@([a-z0-9._]{3,20})$/i);
    if (profileMatch) {
      // Show profile screen immediately with skeleton while Firestore fetch runs.
      this.setState({ screen: 'profile', publicUid: null, publicProfile: null, publicProfileLoading: true, lb: null });
      this._openUsernameProfile(profileMatch[1].toLowerCase());
      return;
    }
    const galleryMatch = path.match(/^\/g\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (galleryMatch) {
      const found = this._allGalleries().find(g => this._galleryPath(g) === path);
      if (found) {
        this.setState({ screen: 'gallery', activeId: found.id, lb: null });
        return;
      }
      // Galleries not loaded yet — show skeleton immediately, retry after auth resolves.
      this._pendingGalleryPath = path;
      this.setState({ screen: 'gallery', activeId: null, galleryLoading: true, lb: null });
      return;
    }
    if (path !== '/') window.history.replaceState(null, '', '/');
    this.setState({ screen: 'home', lb: null, publicUid: null, publicProfile: null });
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
        screen:               'profile',
        lb:                   null,
        slide:                0,
        publicUid:            data.uid,
        publicProfileLoading: false,
        publicProfile: {
          name:         data.name         || '',
          username:     data.username     || username,
          bio:          data.bio          || '',
          location:     data.location     || '',
          website:      data.website      || '',
          websiteLabel: data.websiteLabel || '',
          avatarUrl:    data.profilePhotoUrl || null,
          bannerUrl:    data.bannerUrl        || null,
          nameFont:     data.nameFont         || '',
        },
      }, () => this._loadFollowData(data.uid));
    } catch {
      window.history.replaceState(null, '', '/');
      this.setState({ publicProfileLoading: false });
    }
  };

  // ── navigation ───────────────────────────────────────────────────────────────
  goHome = () => {
    this._pushUrl('/');
    this.setState({ screen: 'home', lb: null, publicUid: null, publicProfile: null });
  };
  goCreate  = () => this.setState({ screen: 'create', lb: null });
  goBack    = () => {
    const url = this._fromUrl || '/';
    this._pushUrl(url);
    const profileMatch = url.match(/^\/@([a-z0-9._]{3,20})$/i);
    if (profileMatch) {
      this._openUsernameProfile(profileMatch[1].toLowerCase());
    } else {
      this.setState({ screen: 'home', lb: null, publicUid: null, publicProfile: null });
    }
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

  // ── search ────────────────────────────────────────────────────────────────────
  handleSearch = async (rawQuery) => {
    const q = rawQuery.trim();
    if (!q) return;
    this.setState({ screen: 'search', searchQuery: q, searchLoading: true, searchResults: null });
    try {
      const [users, firestoreGalleries] = await Promise.all([searchUsers(q), searchGalleries(q)]);

      const artistMap = {}, cityMap = {}, venueMap = {};
      firestoreGalleries.forEach(g => {
        const artist = g.artistName || '';
        if (artist) artistMap[artist] = (artistMap[artist] || 0) + 1;
        if (g.city)  cityMap[g.city]  = (cityMap[g.city]  || 0) + 1;
        if (g.venue) {
          const key = `${g.venue}||${g.city}`;
          if (!venueMap[key]) venueMap[key] = { venue: g.venue, city: g.city, count: 0 };
          venueMap[key].count++;
        }
      });

      this.setState({
        searchLoading: false,
        searchResults: {
          users,
          artists: Object.entries(artistMap).map(([artist, count]) => ({ artist, count })),
          cities:  Object.entries(cityMap).map(([city, count]) => ({ city, count })),
          venues:  Object.values(venueMap),
        },
      });
    } catch {
      this.setState({ searchLoading: false, searchResults: { users: [], artists: [], cities: [], venues: [] } });
      this.flash('Search failed — try again');
    }
  };

  goBackFromSearch = () => this.setState({ screen: 'home', searchQuery: '', searchResults: null });

  openProfileFromList = (username) => {
    if (!username) return;
    this._pushUrl(`/@${username}`);
    this._openUsernameProfile(username);
  };

  // ── auth ─────────────────────────────────────────────────────────────────────
  openLoginModal  = () => this.setState({ loginModal: true, loginError: null });
  closeLoginModal = () => this.setState({ loginModal: false, loginLoading: false, loginError: null });

  handleGoogleSignIn = async () => {
    this.setState({ loginLoading: true, loginError: null });
    try {
      await signInWithGoogle();
      this.setState({ loginModal: false, loginLoading: false, loginError: null, screen: 'profile', slide: 0, lb: null });
    } catch (err) {
      const code = err?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        this.setState({ loginLoading: false, loginError: null });
      } else if (code === 'auth/popup-blocked') {
        this.setState({ loginLoading: false, loginError: 'Your browser blocked the sign-in popup. Allow popups for this site and try again.' });
      } else {
        console.error('Sign-in error:', err);
        this.setState({ loginLoading: false, loginError: null });
        this.flash(`Sign-in failed${code ? ` (${code})` : ''} — try again`);
      }
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

  handleBannerChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !this.state.user) return;
    this.setState({ bannerUploading: true });
    try {
      const url = await uploadBanner(this.state.user.uid, file);
      this.setState(s => ({ profile: { ...s.profile, bannerUrl: url }, bannerUploading: false }));
    } catch {
      this.setState({ bannerUploading: false });
      this.flash('Banner upload failed');
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
        bannerUrl:       profile.bannerUrl  || null,
        nameFont:        profile.nameFont   || null,
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
    this._fromUrl = window.location.pathname;
    const g = this._allGalleries().find(g => g.id === id);
    if (g) this._pushUrl(this._galleryPath(g));
    this.setState({ screen: 'gallery', activeId: id, lb: null });
    window.scrollTo(0, 0);
    if (this.state.user) {
      loadGalleryItems(id)
        .then(items => this.setState(s => ({ galleryItems: { ...s.galleryItems, [id]: items } })))
        .catch(() => {});
    }
  };

  openLb  = (i) => this.setState({ lb: i });
  closeLb = () => this.setState({ lb: null });

  handleGetVideoUrl = async (media) => {
    const { activeId } = this.state;
    try {
      const videoUrl = await callGetVideoUrl(activeId, media.id);
      this.setState(s => ({
        galleryItems: {
          ...s.galleryItems,
          [activeId]: (s.galleryItems[activeId] || []).map(i =>
            i.id === media.id ? { ...i, videoUrl } : i
          ),
        },
      }));
      return videoUrl;
    } catch {
      return null;
    }
  };

  _curMediaLength = () => {
    const { activeId, deleted, extra, galleryItems, uploads } = this.state;
    const ag = this._allGalleries().find(g => g.id === activeId);
    if (!ag) return 0;
    const real   = (galleryItems[ag.id] || []).filter(i => !deleted[i.id]).length;
    const inFlight = Object.values(uploads).filter(u => u.galleryId === activeId).length;
    const legacy = (extra[ag.id] || []).concat((ag.media || []).filter(m => !deleted[m.id])).length;
    return real + inFlight + legacy;
  };

  nextLb = () => {
    const len = this._curMediaLength();
    if (!len) return;
    this.setState(s => ({ lb: (s.lb + 1) % len }));
  };

  prevLb = () => {
    const len = this._curMediaLength();
    if (!len) return;
    this.setState(s => ({ lb: (s.lb - 1 + len) % len }));
  };

  delMedia = async (itemId) => {
    const { activeId, galleryItems } = this.state;
    const isReal = (galleryItems[activeId] || []).some(i => i.id === itemId);
    this.setState(s => ({ deleted: { ...s.deleted, [itemId]: true }, lb: null }));
    if (!isReal) return; // mock item — just hide it
    try {
      await callDeleteItem(itemId, activeId);
      this.setState(s => ({
        galleryItems: {
          ...s.galleryItems,
          [activeId]: (s.galleryItems[activeId] || []).filter(i => i.id !== itemId),
        },
      }));
      this.flash('Photo removed');
    } catch (err) {
      this.setState(s => {
        const d = { ...s.deleted };
        delete d[itemId];
        return { deleted: d };
      });
      this.flash('Could not delete — try again');
    }
  };

  addMedia = (files) => {
    const { user, activeId } = this.state;
    if (!user || !activeId || !files || !files.length) return;
    Array.from(files).forEach(file => {
      const fileId   = crypto.randomUUID();
      const localUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      const type     = file.type.startsWith('video/') ? 'video' : 'photo';

      this.setState(s => ({
        uploads: { ...s.uploads, [fileId]: { galleryId: activeId, file, localUrl, type, status: 'uploading', progress: 0, error: null } },
      }));

      const task = uploadToStaging(user.uid, activeId, fileId, file, progress => {
        this.setState(s => ({
          uploads: { ...s.uploads, [fileId]: { ...s.uploads[fileId], progress } },
        }));
      });

      task.then(() => {
        this.setState(s => ({
          uploads: { ...s.uploads, [fileId]: { ...s.uploads[fileId], status: 'processing', progress: 1 } },
        }));
        const unsub = watchUploadJob(fileId, snap => {
          if (!snap.exists()) return;
          const job = snap.data();
          if (job.status === 'done') {
            unsub();
            delete this._jobUnsubs[fileId];
            loadGalleryItems(activeId).then(items => {
              this.setState(s => {
                const uploads = { ...s.uploads };
                delete uploads[fileId];
                if (localUrl) URL.revokeObjectURL(localUrl);
                return { uploads, galleryItems: { ...s.galleryItems, [activeId]: items } };
              });
            });
          } else if (job.status === 'failed') {
            unsub();
            delete this._jobUnsubs[fileId];
            this.setState(s => ({
              uploads: { ...s.uploads, [fileId]: { ...s.uploads[fileId], status: 'failed', error: job.uploadError || 'Upload failed' } },
            }));
            this.flash(job.uploadError || 'Upload failed — try again');
          }
        });
        this._jobUnsubs[fileId] = unsub;
      }).catch(err => {
        this.setState(s => ({
          uploads: { ...s.uploads, [fileId]: { ...s.uploads[fileId], status: 'failed', error: err.message } },
        }));
        this.flash('Upload failed — try again');
      });
    });
  };

  // ── create form ──────────────────────────────────────────────────────────────
  setF      = (k) => (e) => this.setState(s => ({ create: { ...s.create, [k]: e.target.value } }));
  setArtist = this.setF('artist');
  setVenue  = this.setF('venue');
  setCity   = this.setF('city');
  setMonth  = this.setF('month');
  setYear   = this.setF('year');

  createSubmit = async () => {
    const { user, create, galleries } = this.state;
    if (!user) { this.setState({ loginModal: true }); return; }

    this.setState({ createLoading: true });
    const artistName = create.artist.trim() || 'Untitled Show';
    const venue      = create.venue.trim()  || 'Venue';
    const city       = create.city.trim()   || 'City';
    const monthYear  = `${create.month} ${create.year}`;

    try {
      const dup = await findDuplicateGallery(artistName, venue, city, monthYear);
      if (dup) {
        const local = galleries.find(g =>
          (g.artist || '').toLowerCase() === artistName.toLowerCase() &&
          (g.venue  || '').toLowerCase() === venue.toLowerCase() &&
          (g.city   || '').toLowerCase() === city.toLowerCase() &&
          g.month === create.month && g.year === create.year
        );
        this.setState({ createLoading: false, duplicateGallery: { ...dup, localId: local?.id } });
        return;
      }

      const firestoreId = await createGallery(user.uid, { artistName, venue, city, monthYear });
      const g = {
        id: firestoreId,
        artist: artistName, venue, city,
        month: create.month, year: create.year,
        h1: 5, h2: 290,
        media: [], photoCount: 0, videoCount: 0, contribCount: 1, ownCount: 0,
      };
      this._fromUrl = '/';
      this._pushUrl(this._galleryPath(g));
      this.setState(s => ({
        galleries:     [g, ...s.galleries],
        userGalleries: [g, ...s.userGalleries],
        screen:        'gallery',
        activeId:      g.id,
        create:        { artist: '', venue: '', city: '', month: 'Sep', year: '2025' },
        createLoading: false,
      }));
      window.scrollTo(0, 0);
      this.flash('Gallery created — invite your friends');
    } catch (err) {
      console.error('createSubmit:', err);
      this.setState({ createLoading: false });
      this.flash('Could not create gallery, try again');
    }
  };

  closeDuplicateModal = () => this.setState({ duplicateGallery: null });

  // ── render ───────────────────────────────────────────────────────────────────
  render() {
    const { screen, activeId, lb, slide, deleted, extra, toast, galleries, create, user, loginModal, loginLoading, loginError, profile, editLoading, avatarUploading, bannerUploading, usernameStatus, publicUid, publicProfile, followStatus, followerCount, followingCount, followListType, followList, followListLoading, searchQuery, searchResults, searchLoading, duplicateGallery, createLoading, userGalleries, galleryItems, uploads, publicProfileLoading, galleryLoading } = this.state;

    const isHome        = screen === 'home';
    const isConcert     = screen === 'gallery' || screen === 'create';
    const isUserProfile = screen === 'profile'  || screen === 'editProfile';
    const isFollowList  = screen === 'followList';
    const isSearch      = screen === 'search';

    const isOwnProfile   = !publicUid || publicUid === user?.uid;
    // Prefer publicProfile (always fresh from Firestore) over profile (may have
    // Google-data fallbacks from onAuthStateChanged if stored doc was momentarily unavailable).
    const displayProfile = publicProfile || profile;

    const allGalleries = [...userGalleries, ...galleries.filter(g => !userGalleries.find(u => u.id === g.id))];
    const ag = allGalleries.find(g => g.id === activeId);

    const realItems = ag
      ? (galleryItems[ag.id] || [])
          .filter(i => !deleted[i.id])
          .map(i => ({
            id: i.id, type: i.type === 'image' ? 'photo' : 'video',
            displayUrl: i.displayUrl, thumbnailUrl: i.thumbnailUrl, videoUrl: i.videoUrl || null,
            isOwn: i.uploaderUid === user?.uid,
            ownerUid: i.uploaderUid, ownerName: i.uploaderUid === user?.uid ? 'you' : '',
            ownerH: uidToHue(i.uploaderUid || ''),
            ratio: 1, h1: 0, h2: 0, L: 0.2, duration: null,
          }))
      : [];

    const uploadItems = Object.entries(uploads)
      .filter(([, u]) => u.galleryId === activeId)
      .map(([fileId, u]) => ({
        id: 'upload-' + fileId, type: u.type,
        isUploading: true, localUrl: u.localUrl,
        progress: u.progress, uploadStatus: u.status, uploadError: u.error,
        isOwn: true, ratio: 1, h1: 0, h2: 0, L: 0.2,
        ownerName: 'you', ownerH: uidToHue(user?.uid || ''), duration: null,
      }));

    const legacyItems = ag ? (extra[ag.id] || []).concat((ag.media || []).filter(m => !deleted[m.id])) : [];
    const curMedia = [...realItems, ...uploadItems, ...legacyItems];

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
            onSearch={this.handleSearch}
          />
        )}

        {isSearch && (
          <SearchResultsContainer
            query={searchQuery}
            results={searchResults}
            loading={searchLoading}
            onBack={this.goBackFromSearch}
            onOpenProfile={this._openUsernameProfile}
          />
        )}

        {isConcert && (
          <ConcertContainer
            screen={screen}
            gallery={ag}
            galleryLoading={galleryLoading}
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
            createLoading={createLoading}
            duplicateGallery={duplicateGallery}
            onCloseDuplicate={this.closeDuplicateModal}
            onOpenDuplicateGallery={this.openGallery}
            onFlash={this.flash}
          />
        )}

        {isUserProfile && (
          <UserProfileContainer
            screen={screen}
            user={user}
            profile={displayProfile}
            profileLoading={publicProfileLoading}
            galleries={isOwnProfile ? userGalleries : []}
            isOwn={isOwnProfile}
            slide={slide}
            followStatus={followStatus}
            followerCount={followerCount}
            followingCount={followingCount}
            usernameStatus={usernameStatus}
            storedUsername={this._storedUsername}
            editLoading={editLoading}
            avatarUploading={avatarUploading}
            bannerUploading={bannerUploading}
            onGoBack={this.openGallery}
            onGoEditProfile={this.goEditProfile}
            onSetScreen={this.setScreen}
            onSignOut={this.handleSignOut}
            onSetProfileField={this.setProfileField}
            onUsernameChange={this.handleUsernameChange}
            onAvatarChange={this.handleAvatarChange}
            onBannerChange={this.handleBannerChange}
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
            onGetVideoUrl={this.handleGetVideoUrl}
          />
        )}

        {loginModal && (
          <LoginModal
            loading={loginLoading}
            error={loginError}
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
