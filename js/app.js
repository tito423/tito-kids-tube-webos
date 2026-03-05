/**
 * APP CONTROLLER — Tito Kids Tube WebOS
 * Main application logic with fallback content when API is unavailable.
 */

'use strict';

const App = (() => {
    // --- State ---
    let currentView = 'home';
    let currentProfile = 'kids';
    let currentQuality = 'auto';
    let currentTheme = 'dark';
    let blueLightEnabled = false;
    let queryIndex = 0;

    // --- Fallback content when API is unavailable (real YouTube IDs) ---
    const FALLBACK_VIDEOS = [
        { id: 'XqZsoesa55w', title: 'تعليم الاطفال الالوان بالعربية', uploaderName: 'قناة تعليمية', thumbnail: 'https://i.ytimg.com/vi/XqZsoesa55w/hqdefault.jpg', duration: 300, description: '' },
        { id: 'hYlFMGGFJBc', title: 'تعلم الحروف العربية مع زكريا', uploaderName: 'تعلم مع زكريا', thumbnail: 'https://i.ytimg.com/vi/hYlFMGGFJBc/hqdefault.jpg', duration: 600, description: '' },
        { id: '5sFkGtBPaVE', title: 'اناشيد اسلامية للاطفال - محمد نبينا', uploaderName: 'اناشيد اطفال', thumbnail: 'https://i.ytimg.com/vi/5sFkGtBPaVE/hqdefault.jpg', duration: 240, description: '' },
        { id: 'pranan193pw', title: 'قصص الأنبياء للأطفال - قصة سيدنا نوح', uploaderName: 'قصص القرآن', thumbnail: 'https://i.ytimg.com/vi/pranan193pw/hqdefault.jpg', duration: 480, description: '' },
        { id: 'L0aWUhkbwxM', title: 'كرتون سراج - الحلقة الأولى', uploaderName: 'سراج كرتون', thumbnail: 'https://i.ytimg.com/vi/L0aWUhkbwxM/hqdefault.jpg', duration: 660, description: '' },
        { id: 'G69qn2ANYG4', title: 'الارقام العربية للاطفال', uploaderName: 'تعلم العربية', thumbnail: 'https://i.ytimg.com/vi/G69qn2ANYG4/hqdefault.jpg', duration: 360, description: '' },
    ];

    // --- DOM References ---
    const DOM = {};

    function init() {
        cacheDOM();
        bindEvents();
        loadSettings();
        SpatialNav.init();
        loadHomeContent();
        console.log('Tito Kids Tube WebOS initialized');
    }

    function cacheDOM() {
        DOM.app = document.getElementById('app');
        DOM.videoGrid = document.getElementById('video-grid');
        DOM.searchResults = document.getElementById('search-results');
        DOM.searchInput = document.getElementById('search-input');
        DOM.loading = document.getElementById('loading-indicator');
        DOM.error = document.getElementById('error-message');
        DOM.errorText = document.getElementById('error-text');
        DOM.profileBadge = document.getElementById('profile-badge');
        DOM.blueLightOverlay = document.getElementById('blue-light-overlay');
        DOM.videoPlayer = document.getElementById('video-player');
        DOM.playerTitle = document.getElementById('player-title');
        DOM.playerChannel = document.getElementById('player-channel');
    }

    function bindEvents() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                if (view) switchView(view);
            });
        });

        // Search
        document.getElementById('btn-search')?.addEventListener('click', performSearch);
        DOM.searchInput?.addEventListener('keydown', (e) => {
            if (e.keyCode === 13) performSearch();
        });

        // Refresh / Retry
        document.getElementById('btn-refresh')?.addEventListener('click', loadHomeContent);
        document.getElementById('btn-retry')?.addEventListener('click', loadHomeContent);

        // Back button (from player)
        document.getElementById('btn-back')?.addEventListener('click', () => switchView('home'));

        // Back button from remote
        document.addEventListener('navBack', handleBack);

        // Profile buttons
        document.querySelectorAll('[data-profile]').forEach(btn => {
            btn.addEventListener('click', () => setProfile(btn.dataset.profile));
        });

        // Theme buttons
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', () => setTheme(btn.dataset.theme));
        });

        // Quality buttons
        document.querySelectorAll('[data-quality]').forEach(btn => {
            btn.addEventListener('click', () => setQuality(btn.dataset.quality));
        });

        // Blue light filter
        document.getElementById('btn-bluelight')?.addEventListener('click', toggleBlueLight);
    }

    // === VIEW MANAGEMENT ===

    function switchView(viewName) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });

        const target = document.getElementById('view-' + viewName);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        if (viewName !== 'player') pausePlayer();
        currentView = viewName;

        setTimeout(() => {
            SpatialNav.refresh();
            const firstFocusable = target?.querySelector('.focusable');
            if (firstFocusable) SpatialNav.focusElement(firstFocusable);
        }, 100);
    }

    function handleBack() {
        if (currentView === 'player') switchView('home');
        else if (currentView !== 'home') switchView('home');
    }

    // === CONTENT LOADING ===

    async function loadHomeContent() {
        showLoading(true);
        hideError();

        try {
            const queries = ContentFilter.getSafeQueries(currentProfile);
            const query = queries[queryIndex % queries.length];
            queryIndex++;

            console.log('Loading content for query:', query);
            const results = await PipedService.searchVideos(query);
            const filtered = ContentFilter.filterVideos(results, currentProfile);

            if (filtered.length > 0) {
                renderVideoGrid(DOM.videoGrid, filtered);
            } else {
                // Show fallback content when API returns nothing
                console.log('No API results, showing fallback content');
                renderVideoGrid(DOM.videoGrid, FALLBACK_VIDEOS);
            }
        } catch (err) {
            console.error('Content load failed:', err);
            // Show fallback on error
            renderVideoGrid(DOM.videoGrid, FALLBACK_VIDEOS);
        } finally {
            showLoading(false);
        }
    }

    async function performSearch() {
        const raw = DOM.searchInput?.value || '';
        const query = Security.sanitizeSearch(raw);
        if (!query) return;

        showLoading(true);
        hideError();

        try {
            const results = await PipedService.searchVideos(query);
            const filtered = ContentFilter.filterVideos(results, currentProfile);

            if (filtered.length > 0) {
                renderVideoGrid(DOM.searchResults, filtered);
            } else {
                DOM.searchResults.innerHTML = '<div class="error-message"><span>لا نتائج لـ "' + Security.escapeHtml(query) + '"</span></div>';
            }
        } catch (err) {
            console.error('Search failed:', err);
            DOM.searchResults.innerHTML = '<div class="error-message"><span>فشل البحث. حاول مرة أخرى.</span></div>';
        } finally {
            showLoading(false);
            SpatialNav.refresh();
        }
    }

    // === RENDERING ===

    function renderVideoGrid(container, videos) {
        if (!container) return;

        container.innerHTML = videos.map(video => {
            const safeTitle = Security.escapeHtml(video.title);
            const safeChannel = Security.escapeHtml(video.uploaderName);
            const safeId = Security.escapeHtml(video.id);
            const thumbUrl = video.thumbnail || ('https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg');

            return '<div class="video-card focusable" data-video-id="' + safeId + '" tabindex="0" role="button" aria-label="' + safeTitle + '">' +
                '<div class="thumbnail-wrapper">' +
                '<img class="thumbnail" src="' + Security.escapeHtml(thumbUrl) + '" alt="' + safeTitle + '" loading="lazy" onerror="this.style.display=\'none\'">' +
                '<span class="duration-badge">' + PipedService.formatDuration(video.duration) + '</span>' +
                '</div>' +
                '<div class="card-info">' +
                '<h3 class="card-title">' + safeTitle + '</h3>' +
                '<p class="card-channel">' + safeChannel + '</p>' +
                '</div>' +
                '</div>';
        }).join('');

        // Bind click events
        container.querySelectorAll('.video-card').forEach(card => {
            card.addEventListener('click', () => {
                const vid = card.dataset.videoId;
                const title = card.querySelector('.card-title')?.textContent || '';
                const channel = card.querySelector('.card-channel')?.textContent || '';
                playVideo(vid, title, channel);
            });
        });

        SpatialNav.refresh();
    }

    // === VIDEO PLAYER (YouTube IFrame Embed) ===

    let ytPlayer = null;
    let ytReady = false;

    /**
     * Load YouTube IFrame Player API dynamically.
     */
    function loadYouTubeAPI() {
        return new Promise((resolve) => {
            if (window.YT && window.YT.Player) { resolve(); return; }
            window.onYouTubeIframeAPIReady = () => {
                ytReady = true;
                resolve();
            };
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(tag);
        });
    }

    async function playVideo(videoId, title, channel) {
        switchView('player');
        Security.safeSetText(DOM.playerTitle, title || 'جاري التحميل...');
        Security.safeSetText(DOM.playerChannel, channel || '');

        try {
            // Try to get metadata from API (non-blocking)
            PipedService.getVideoStreams(videoId).then(streamData => {
                if (streamData) {
                    if (streamData.title) Security.safeSetText(DOM.playerTitle, streamData.title);
                    if (streamData.uploader) Security.safeSetText(DOM.playerChannel, streamData.uploader);
                }
            }).catch(() => { });

            // Load YouTube IFrame API
            await loadYouTubeAPI();

            // Get or create the player container
            const container = document.getElementById('player-embed-container');

            if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
                // Reuse existing player
                ytPlayer.loadVideoById(videoId);
            } else {
                // Clear container and create new player
                container.innerHTML = '<div id="yt-player-div"></div>';
                ytPlayer = new YT.Player('yt-player-div', {
                    videoId: videoId,
                    width: '100%',
                    height: '100%',
                    playerVars: {
                        autoplay: 1,
                        controls: 1,
                        modestbranding: 1,
                        rel: 0,
                        fs: 1,
                        cc_load_policy: 0,
                        iv_load_policy: 3,
                        playsinline: 1,
                        origin: window.location.origin,
                    },
                    events: {
                        onError: (event) => {
                            console.error('YouTube Player error:', event.data);
                            Security.safeSetText(DOM.playerTitle, 'حدث خطأ في تشغيل الفيديو');
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Player error:', err);
            Security.safeSetText(DOM.playerTitle, 'حدث خطأ أثناء التشغيل');
        }
    }

    function pausePlayer() {
        try {
            if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
                ytPlayer.pauseVideo();
            }
        } catch (e) { /* ignore */ }
    }

    // === SETTINGS ===

    function setProfile(profile) {
        currentProfile = profile;
        document.querySelectorAll('[data-profile]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.profile === profile);
        });
        Security.safeSetText(DOM.profileBadge, profile === 'kids' ? 'اطفال' : 'ناشئين');
        saveSettings();
        if (currentView === 'home') loadHomeContent();
    }

    function setTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
        saveSettings();
    }

    function setQuality(quality) {
        currentQuality = quality;
        document.querySelectorAll('[data-quality]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.quality === quality);
        });
        saveSettings();
    }

    function toggleBlueLight() {
        blueLightEnabled = !blueLightEnabled;
        DOM.blueLightOverlay?.classList.toggle('hidden', !blueLightEnabled);
        document.getElementById('btn-bluelight')?.classList.toggle('active', blueLightEnabled);
        saveSettings();
    }

    // === PERSISTENCE ===

    function saveSettings() {
        try {
            localStorage.setItem('tito_settings', JSON.stringify({
                profile: currentProfile,
                quality: currentQuality,
                theme: currentTheme,
                blueLight: blueLightEnabled,
            }));
        } catch (e) { /* ignore */ }
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem('tito_settings');
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s.profile) setProfile(s.profile);
            if (s.quality) setQuality(s.quality);
            if (s.theme) setTheme(s.theme);
            if (s.blueLight) toggleBlueLight();
        } catch (e) { /* ignore */ }
    }

    // === UI HELPERS ===

    function showLoading(show) {
        DOM.loading?.classList.toggle('hidden', !show);
    }

    function showError(msg) {
        Security.safeSetText(DOM.errorText, msg);
        DOM.error?.classList.remove('hidden');
    }

    function hideError() {
        DOM.error?.classList.add('hidden');
    }

    // === INIT ===
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { switchView, loadHomeContent, playVideo, setProfile, setTheme, setQuality };
})();
