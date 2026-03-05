/**
 * SPATIAL NAVIGATION — Tito Kids Tube WebOS
 * Full D-pad and Magic Remote focus management for LG Smart TVs.
 * Implements directional navigation (Up/Down/Left/Right/Enter/Back).
 */

'use strict';

const SpatialNav = (() => {
    let focusableElements = [];
    let currentFocusIndex = -1;
    let currentFocusedElement = null;
    let enabled = true;

    // LG WebOS remote key codes
    const KEYS = {
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
        ENTER: 13,
        BACK: 461,   // LG WebOS back button
        BACK_ALT: 8,   // Fallback backspace
        RED: 403,
        GREEN: 404,
        YELLOW: 405,
        BLUE: 406,
    };

    /**
     * Initialize spatial navigation.
     */
    function init() {
        document.addEventListener('keydown', handleKeyDown);
        refresh();
        // Auto-focus first focusable element
        if (focusableElements.length > 0) {
            setFocus(0);
        }
    }

    /**
     * Refresh the list of focusable elements (call after DOM changes).
     */
    function refresh() {
        focusableElements = Array.from(
            document.querySelectorAll('.focusable:not(.hidden):not([disabled])')
        ).filter(el => {
            // Only include visible elements
            return el.offsetParent !== null || el.closest('.view.active, .nav-bar');
        });
    }

    /**
     * Set focus on element at given index.
     * @param {number} index - Index in focusableElements array
     */
    function setFocus(index) {
        if (index < 0 || index >= focusableElements.length) return;

        // Remove focus from current
        if (currentFocusedElement) {
            currentFocusedElement.classList.remove('focused');
            currentFocusedElement.blur();
        }

        currentFocusIndex = index;
        currentFocusedElement = focusableElements[index];
        currentFocusedElement.classList.add('focused');
        currentFocusedElement.focus({ preventScroll: false });

        // Scroll element into view if needed
        scrollIntoViewIfNeeded(currentFocusedElement);
    }

    /**
     * Focus a specific element by reference.
     * @param {HTMLElement} element
     */
    function focusElement(element) {
        const index = focusableElements.indexOf(element);
        if (index !== -1) {
            setFocus(index);
        }
    }

    /**
     * Handle key press for directional navigation.
     * @param {KeyboardEvent} e
     */
    function handleKeyDown(e) {
        if (!enabled) return;

        switch (e.keyCode) {
            case KEYS.LEFT:
                e.preventDefault();
                moveDirection('left');
                break;
            case KEYS.RIGHT:
                e.preventDefault();
                moveDirection('right');
                break;
            case KEYS.UP:
                e.preventDefault();
                moveDirection('up');
                break;
            case KEYS.DOWN:
                e.preventDefault();
                moveDirection('down');
                break;
            case KEYS.ENTER:
                e.preventDefault();
                activateCurrent();
                break;
            case KEYS.BACK:
            case KEYS.BACK_ALT:
                e.preventDefault();
                handleBack();
                break;
        }
    }

    /**
     * Move focus in a direction using spatial proximity algorithm.
     * @param {'left'|'right'|'up'|'down'} direction
     */
    function moveDirection(direction) {
        if (!currentFocusedElement || focusableElements.length === 0) {
            if (focusableElements.length > 0) setFocus(0);
            return;
        }

        const currentRect = currentFocusedElement.getBoundingClientRect();
        const cx = currentRect.left + currentRect.width / 2;
        const cy = currentRect.top + currentRect.height / 2;

        let bestCandidate = null;
        let bestDistance = Infinity;

        for (let i = 0; i < focusableElements.length; i++) {
            if (i === currentFocusIndex) continue;

            const el = focusableElements[i];
            const rect = el.getBoundingClientRect();
            const ex = rect.left + rect.width / 2;
            const ey = rect.top + rect.height / 2;

            // Check if element is in the correct direction
            let isInDirection = false;
            switch (direction) {
                case 'left':
                    isInDirection = ex < cx - 10;
                    break;
                case 'right':
                    isInDirection = ex > cx + 10;
                    break;
                case 'up':
                    isInDirection = ey < cy - 10;
                    break;
                case 'down':
                    isInDirection = ey > cy + 10;
                    break;
            }

            if (!isInDirection) continue;

            // Calculate distance (weighted: primary axis matters more)
            const dx = ex - cx;
            const dy = ey - cy;
            let distance;

            if (direction === 'left' || direction === 'right') {
                distance = Math.abs(dx) + Math.abs(dy) * 2; // horizontal priority
            } else {
                distance = Math.abs(dy) + Math.abs(dx) * 2; // vertical priority
            }

            if (distance < bestDistance) {
                bestDistance = distance;
                bestCandidate = i;
            }
        }

        if (bestCandidate !== null) {
            setFocus(bestCandidate);
        }
    }

    /**
     * Activate (click) the currently focused element.
     */
    function activateCurrent() {
        if (currentFocusedElement) {
            currentFocusedElement.click();
        }
    }

    /**
     * Handle back button — dispatches custom event for app to handle.
     */
    function handleBack() {
        document.dispatchEvent(new CustomEvent('navBack'));
    }

    /**
     * Scroll element into view smoothly if it's not visible.
     * @param {HTMLElement} element
     */
    function scrollIntoViewIfNeeded(element) {
        const container = element.closest('.main-content');
        if (!container) return;

        const elRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (elRect.bottom > containerRect.bottom) {
            container.scrollBy({ top: elRect.bottom - containerRect.bottom + 40, behavior: 'smooth' });
        } else if (elRect.top < containerRect.top) {
            container.scrollBy({ top: elRect.top - containerRect.top - 40, behavior: 'smooth' });
        }
    }

    /**
     * Enable/disable navigation (useful when showing dialogs).
     * @param {boolean} state
     */
    function setEnabled(state) {
        enabled = state;
    }

    /**
     * Get the currently focused element.
     * @returns {HTMLElement|null}
     */
    function getCurrentFocus() {
        return currentFocusedElement;
    }

    return {
        init,
        refresh,
        setFocus,
        focusElement,
        setEnabled,
        getCurrentFocus,
        KEYS,
    };
})();
