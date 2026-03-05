/**
 * VIDEO API SERVICE — Tito Kids Tube WebOS
 * Uses Invidious API for search/metadata (CORS-friendly)
 * Falls back to curated content when APIs are unavailable.
 */

'use strict';

const PipedService = (() => {
    // Invidious instances (generally more CORS-friendly than Piped)
    const INVIDIOUS_INSTANCES = [
        'https://vid.puffyan.us',
        'https://invidious.fdn.fr',
        'https://invidious.nerdvpn.de',
        'https://inv.tux.pizza',
        'https://invidious.privacyredirect.com',
        'https://invidious.protokolla.fi',
    ];

    let currentInstance = 0;

    function rotateInstance() {
        currentInstance = (currentInstance + 1) % INVIDIOUS_INSTANCES.length;
        console.log('VideoAPI: Rotated to', INVIDIOUS_INSTANCES[currentInstance]);
    }

    /**
     * Try fetching from all Invidious instances with timeout.
     */
    async function apiFetch(path) {
        for (let attempt = 0; attempt < INVIDIOUS_INSTANCES.length; attempt++) {
            const base = INVIDIOUS_INSTANCES[(currentInstance + attempt) % INVIDIOUS_INSTANCES.length];
            const url = base + path;
            try {
                console.log('VideoAPI: Trying', url);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                const response = await fetch(url, {
                    credentials: 'omit',
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const data = await response.json();
                // Remember working instance
                currentInstance = (currentInstance + attempt) % INVIDIOUS_INSTANCES.length;
                console.log('VideoAPI: Success from', base);
                return data;
            } catch (err) {
                console.warn('VideoAPI: Failed on', base, err.message);
            }
        }
        console.error('VideoAPI: All instances failed');
        return null;
    }

    /**
     * Search for videos via Invidious API.
     */
    async function searchVideos(query) {
        const encoded = encodeURIComponent(query);
        const data = await apiFetch('/api/v1/search?q=' + encoded + '&type=video&sort_by=relevance');
        if (!data || !Array.isArray(data)) return [];

        return data
            .filter(item => item.type === 'video')
            .map(item => ({
                id: item.videoId || '',
                title: item.title || '',
                description: item.description || item.descriptionHtml || '',
                uploaderName: item.author || '',
                uploaderUrl: item.authorUrl || '',
                thumbnail: getBestThumbnail(item.videoThumbnails, item.videoId),
                duration: item.lengthSeconds || 0,
                views: item.viewCount || 0,
                uploadedDate: item.publishedText || '',
            }));
    }

    /**
     * Get the best thumbnail URL.
     */
    function getBestThumbnail(thumbnails, videoId) {
        if (thumbnails && thumbnails.length > 0) {
            // Prefer medium quality for faster loading
            const medium = thumbnails.find(t => t.quality === 'medium' || t.quality === 'middle');
            if (medium && medium.url) {
                // Use ytimg.com directly (more reliable than invidious proxy)
                return 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg';
            }
        }
        return videoId ? 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg' : '';
    }

    /**
     * Get video details (used for title/channel info before embed playback).
     */
    async function getVideoStreams(videoId) {
        // For YouTube embed, we don't need stream URLs
        // But we can get metadata from Invidious
        const data = await apiFetch('/api/v1/videos/' + videoId + '?fields=title,author,lengthSeconds,videoThumbnails');
        if (!data) {
            // Return minimal data so embed can still work
            return {
                title: '',
                uploader: '',
                thumbnail: 'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg',
                duration: 0,
                videoId: videoId,
                useEmbed: true,
            };
        }

        return {
            title: data.title || '',
            uploader: data.author || '',
            thumbnail: getBestThumbnail(data.videoThumbnails, videoId),
            duration: data.lengthSeconds || 0,
            videoId: videoId,
            useEmbed: true, // Always use YouTube embed for reliable playback
        };
    }

    /**
     * For embed player, just return the video ID for iframe embedding.
     */
    function selectBestStream(streamData, quality) {
        if (!streamData) return null;
        // Signal to use YouTube embed
        return {
            url: streamData.videoId || '',
            isEmbed: true,
            isHls: false,
        };
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
