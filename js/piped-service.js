/**
 * PIPED API SERVICE — Tito Kids Tube WebOS
 * YouTube proxy via Piped for ad-free, privacy-respecting video streams.
 * Includes CORS proxy support for GitHub Pages / web hosting.
 */

'use strict';

const PipedService = (() => {
    // Multiple Piped instances for reliability
    const INSTANCES = [
        'https://pipedapi.kavin.rocks',
        'https://pipedapi.adminforge.de',
        'https://pipedapi.r4fo.com',
        'https://pipedapi.moomoo.me',
    ];

    // CORS proxies to try when direct access is blocked
    const CORS_PROXIES = [
        'https://corsproxy.io/?url=',
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
    ];

    let currentInstance = 0;
    let currentProxy = -1; // -1 = no proxy (direct), 0+ = proxy index
    let useProxy = false;

    function getBaseUrl() {
        return INSTANCES[currentInstance];
    }

    function rotateInstance() {
        currentInstance = (currentInstance + 1) % INSTANCES.length;
        console.log('PipedService: Switched to', INSTANCES[currentInstance]);
    }

    function buildUrl(path) {
        const directUrl = getBaseUrl() + path;
        if (useProxy && currentProxy >= 0 && currentProxy < CORS_PROXIES.length) {
            return CORS_PROXIES[currentProxy] + encodeURIComponent(directUrl);
        }
        return directUrl;
    }

    /**
     * Fetch with retry across all instances, with CORS proxy fallback.
     */
    async function apiFetch(path) {
        // First try all instances directly
        if (!useProxy) {
            for (let attempt = 0; attempt < INSTANCES.length; attempt++) {
                try {
                    const url = getBaseUrl() + path;
                    console.log('PipedService: Fetching (direct)', url);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const response = await fetch(url, { credentials: 'omit', signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return await response.json();
                } catch (err) {
                    console.warn('PipedService: Direct failed on', getBaseUrl(), err.message);
                    rotateInstance();
                }
            }
            // All direct attempts failed — switch to CORS proxy mode
            console.log('PipedService: All direct attempts failed, switching to CORS proxy');
            useProxy = true;
            currentProxy = 0;
            currentInstance = 0;
        }

        // Try with CORS proxies
        for (let p = 0; p < CORS_PROXIES.length; p++) {
            currentProxy = p;
            for (let i = 0; i < INSTANCES.length; i++) {
                currentInstance = i;
                try {
                    const url = buildUrl(path);
                    console.log('PipedService: Fetching (proxy ' + p + ')', url);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    const response = await fetch(url, { credentials: 'omit', signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const data = await response.json();
                    // This proxy+instance combo works — remember it
                    console.log('PipedService: Working combo found — proxy:', CORS_PROXIES[p], 'instance:', INSTANCES[i]);
                    return data;
                } catch (err) {
                    console.warn('PipedService: Proxy', p, 'instance', i, 'failed:', err.message);
                }
            }
        }

        console.error('PipedService: All instances and proxies failed');
        return null;
    }

    /**
     * Search for videos.
     */
    async function searchVideos(query) {
        const encoded = encodeURIComponent(query);
        const data = await apiFetch('/search?q=' + encoded + '&filter=videos');
        if (!data || !data.items) return [];

        return data.items.map(item => ({
            id: extractVideoId(item.url),
            title: item.title || '',
            description: item.shortDescription || '',
            uploaderName: item.uploaderName || '',
            uploaderUrl: item.uploaderUrl || '',
            thumbnail: item.thumbnail || '',
            duration: item.duration || 0,
            views: item.views || 0,
            uploadedDate: item.uploadedDate || '',
        }));
    }

    /**
     * Get video streams (for playback).
     */
    async function getVideoStreams(videoId) {
        const data = await apiFetch('/streams/' + videoId);
        if (!data) return null;

        return {
            title: data.title || '',
            uploader: data.uploader || '',
            thumbnail: data.thumbnailUrl || '',
            duration: data.duration || 0,
            videoStreams: data.videoStreams || [],
            audioStreams: data.audioStreams || [],
            hlsUrl: data.hls || null,
            proxyUrl: data.proxyUrl || null,
        };
    }

    /**
     * Select the best playable stream.
     * Returns { url, isHls } for the player to handle.
     */
    function selectBestStream(streamData, quality) {
        if (!streamData) return null;

        // HLS first (best for TV and works with hls.js in browsers)
        if (streamData.hlsUrl) {
            const hlsUrl = Security.enforceHttps(streamData.hlsUrl);
            return { url: hlsUrl, isHls: true };
        }

        // Muxed MP4 streams (prefer Piped-proxied URLs)
        let streams = streamData.videoStreams.filter(s =>
            s.videoOnly === false && s.mimeType && s.mimeType.includes('video/mp4')
        );

        // Fallback to any muxed stream
        if (streams.length === 0) {
            streams = streamData.videoStreams.filter(s => s.videoOnly === false);
        }

        if (streams.length === 0) return null;

        // Sort by quality descending
        streams.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));

        // Pick requested quality or best available
        let selected;
        if (quality && quality !== 'auto') {
            selected = streams.find(s => s.quality === quality) || streams[0];
        } else {
            selected = streams.find(s => s.quality === '720p') || streams[0];
        }

        if (!selected || !selected.url) return null;

        let finalUrl = Security.enforceHttps(selected.url);

        // If we're using a CORS proxy, proxy the video URL too
        if (useProxy && currentProxy >= 0 && currentProxy < CORS_PROXIES.length) {
            finalUrl = CORS_PROXIES[currentProxy] + encodeURIComponent(finalUrl);
        }

        return { url: finalUrl, isHls: false };
    }

    function extractVideoId(url) {
        if (!url) return '';
        const match = url.match(/[?&]v=([^&]+)/);
        if (match) return match[1];
        const pathMatch = url.match(/\/watch\/([^/?]+)/);
        if (pathMatch) return pathMatch[1];
        return url.replace('/watch?v=', '');
    }

    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
        return m + ':' + String(s).padStart(2, '0');
    }

    return {
        searchVideos,
        getVideoStreams,
        selectBestStream,
        formatDuration,
    };
})();
