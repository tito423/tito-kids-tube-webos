/**
 * SECURITY MODULE — Tito Kids Tube WebOS
 * Input sanitization, HTTPS enforcement, and safe DOM manipulation.
 */

'use strict';

const Security = (() => {
    const MAX_SEARCH_LENGTH = 200;

    /**
     * Sanitize a search query — removes HTML, script injection, SQL patterns.
     */
    function sanitizeSearch(input) {
        if (!input || typeof input !== 'string') return '';
        let cleaned = input.trim();
        cleaned = cleaned.replace(/<[^>]*>/g, '');
        cleaned = cleaned.replace(/javascript:/gi, '');
        cleaned = cleaned.replace(/on\w+\s*=/gi, '');
        cleaned = cleaned.replace(/(['";]|--|\b(DROP|DELETE|INSERT|UPDATE|ALTER|EXEC)\b)/gi, '');
        if (cleaned.length > MAX_SEARCH_LENGTH) {
            cleaned = cleaned.substring(0, MAX_SEARCH_LENGTH);
        }
        return cleaned;
    }

    /**
     * Sanitize text for safe DOM insertion (prevents XSS).
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Enforce HTTPS on a URL. Auto-upgrades http:// to https://.
     */
    function enforceHttps(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.startsWith('http://')) {
            return url.replace('http://', 'https://');
        }
        return url;
    }

    /**
     * Secure fetch — auto-upgrades to HTTPS, no restrictive CORS mode.
     */
    async function secureFetch(url, options = {}) {
        let safeUrl = enforceHttps(url);
        return fetch(safeUrl, {
            ...options,
            credentials: 'omit',
        });
    }

    /**
     * Safely set text content on an element.
     */
    function safeSetText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }

    return {
        sanitizeSearch,
        escapeHtml,
        enforceHttps,
        secureFetch,
        safeSetText,
        MAX_SEARCH_LENGTH,
    };
})();
