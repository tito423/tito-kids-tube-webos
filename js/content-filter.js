/**
 * CONTENT FILTER — Tito Kids Tube WebOS
 * Ported from Flutter app. Provides strict (kids) and moderate (tween) filtering.
 */

'use strict';

const ContentFilter = (() => {
    // Safe search queries per profile
    const SAFE_QUERIES = {
        kids: [
            'أسرتنا tv',
            'سبيستون أطفال',
            'سراج كرتون إسلامي',
            'قصص الأنبياء للأطفال',
            'أناشيد إسلامية للأطفال بدون موسيقى',
            'تعلم مع زكريا بالعربي',
            'كرتون إسلامي هادف',
            'عمر وهناء بالعربي',
        ],
        tween: [
            'قصص القرآن',
            'وثائقي علمي للأطفال',
            'تعلم العلوم بالعربي',
            'قصص تاريخية للأطفال',
            'كرتون تعليمي',
            'رسم وفنون للأطفال',
            'تجارب علمية بسيطة',
        ],
    };

    // Blocklist keywords
    const BLOCKLIST_BASE = [
        'prank', 'challenge', 'kiss', 'dating', 'boyfriend', 'girlfriend',
        'fight', 'punch', 'kill', 'ghost', 'scary', 'horror', 'magic',
        'witch', 'wizard', 'music video', 'dance', 'shirk', 'haram',
        'tiktok', 'shorts', 'مقلب', 'تحدي خطير',
    ];

    const BLOCKLIST_STRICT = [
        ...BLOCKLIST_BASE,
        'fortnite', 'roblox', 'minecraft', 'gaming', 'gamer',
        'slime', 'asmr', 'mukbang', 'unboxing',
        'العاب', 'قيمنق', 'فورتنايت', 'ماين كرافت',
    ];

    /**
     * Check if a video is safe based on profile.
     * @param {object} video - Video with title/description/uploaderName
     * @param {string} profileType - 'kids' or 'tween'
     * @returns {boolean}
     */
    function isVideoSafe(video, profileType = 'kids') {
        const text = `${video.title || ''} ${video.description || ''} ${video.uploaderName || ''}`.toLowerCase();
        const blocklist = profileType === 'kids' ? BLOCKLIST_STRICT : BLOCKLIST_BASE;

        for (const keyword of blocklist) {
            if (text.includes(keyword.toLowerCase())) {
                console.log(`ContentFilter: Blocked "${video.title}" — keyword: ${keyword}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Check if text contains Arabic characters.
     * @param {string} text
     * @returns {boolean}
     */
    function hasArabicCharacters(text) {
        return /[\u0600-\u06FF]/.test(text);
    }

    /**
     * Filter an array of videos.
     * @param {Array} videos
     * @param {string} profileType - 'kids' or 'tween'
     * @returns {Array}
     */
    function filterVideos(videos, profileType = 'kids') {
        return videos.filter(video => {
            if (!isVideoSafe(video, profileType)) return false;
            if (profileType === 'kids' && !hasArabicCharacters(video.title || '')) return false;
            return true;
        });
    }

    /**
     * Get safe queries for current profile.
     * @param {string} profileType - 'kids' or 'tween'
     * @returns {Array<string>}
     */
    function getSafeQueries(profileType) {
        if (profileType === 'kids') {
            return SAFE_QUERIES.kids;
        }
        return [...SAFE_QUERIES.kids, ...SAFE_QUERIES.tween];
    }

    /**
     * Get a random safe query for variety.
     * @param {string} profileType
     * @returns {string}
     */
    function getRandomQuery(profileType) {
        const queries = getSafeQueries(profileType);
        return queries[Math.floor(Math.random() * queries.length)];
    }

    return {
        isVideoSafe,
        hasArabicCharacters,
        filterVideos,
        getSafeQueries,
        getRandomQuery,
        SAFE_QUERIES,
    };
})();
