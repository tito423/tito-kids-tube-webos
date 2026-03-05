/**
 * PIPED API SERVICE — Tito Kids Tube WebOS
 * YouTube proxy via Piped for ad-free, privacy-respecting video streams.
 */

'use strict';

const PipedService = (() => {
    // Multiple Piped instances for reliability — tries each on failure
    const INSTANCES = [
        'https://pipedapi.kavin.rocks',
        'https://pipedapi.adminforge.de',
        'https://watchapi.whatever.social',
        'https://api.piped.yt',
    ];

    let currentInstance = 0;

    function getBaseUrl() {
        return INSTANCES[currentInstance];
    }

    function rotateInstance() {
        currentInstance = (currentInstance + 1) % INSTANCES.length;
        console.log('PipedService: Switched to', INSTANCES[currentInstance]);
    }

    /**
     * Fetch with retry across all instances.
     */
    async function apiFetch(path) {
        for (let attempt = 0; attempt < INSTANCES.length; attempt++) {
            try {
                const url = getBaseUrl() + path;
                console.log('PipedService: Fetching', url);
                const response = await fetch(url, { credentials: 'omit' });
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return await response.json();
            } catch (err) {
                console.warn('PipedService: Failed on', getBaseUrl(), err.message);
                rotateInstance();
            }
        }
        console.error('PipedService: All instances failed');
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
        };
    }

    /**
     * Select the best playable stream.
     */
    function selectBestStream(streamData, quality) {
        if (!streamData) return null;

        // HLS first (best for TV)
        if (streamData.hlsUrl) {
            return Security.enforceHttps(streamData.hlsUrl);
        }

        // Muxed MP4 streams
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

        return selected && selected.url ? Security.enforceHttps(selected.url) : null;
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
