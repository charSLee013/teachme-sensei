/**
 * Pi Agent Harness — Interactive Teaching Site
 * Client-side application logic.
 *
 * Handles:
 *   - Sidebar toggle (mobile)
 *   - Code block expand/collapse
 *   - Quiz interaction
 *   - Full-text search across chapters
 *   - Tooltip initialisation for data-term elements
 *   - Progress tracking via localStorage
 *   - Keyboard navigation (left/right arrows)
 */

'use strict';

/* ============================================================================ */
/* 1. Configuration                                                             */
/* ============================================================================ */

const COLLAPSIBLE_LINE_THRESHOLD = 15;   // lines above which a block gets the collapsible treatment
const COLLAPSIBLE_MAX_VISIBLE = 280;     // collapsed height in px
const STORAGE_KEY = 'pi-teach-progress';

/* ============================================================================ */
/* 2. DOM Ready                                                                 */
/* ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initCodeBlocks();
    initQuizzes();
    initSearch();
    initTooltips();
    initKeyboardNav();
    initSmoothScroll();
    trackChapterVisit();
});

/* ============================================================================ */
/* 3. Sidebar Toggle (mobile)                                                   */
/* ============================================================================ */

function initSidebar() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (event) => {
        if (window.innerWidth > 768) return;
        if (!sidebar.contains(event.target) && !toggle.contains(event.target)) {
            sidebar.classList.remove('open');
        }
    });

    // Close sidebar after a chapter link is tapped on mobile
    sidebar.querySelectorAll('.chapter-list a').forEach((link) => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    });
}

/* ============================================================================ */
/* 4. Code Block Expand / Collapse                                              */
/* ============================================================================ */

function initCodeBlocks() {
    document.querySelectorAll('pre').forEach((pre) => {
        const lines = pre.querySelectorAll('code, .line, br');
        const lineCount = lines.length || (pre.textContent.match(/\n/g) || []).length + 1;

        if (lineCount <= COLLAPSIBLE_LINE_THRESHOLD) return;

        pre.classList.add('collapsible');

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'code-toggle';
        toggleBtn.type = 'button';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.innerHTML = '<span class="arrow">▼</span> 展开';

        toggleBtn.addEventListener('click', () => {
            const expanded = pre.classList.toggle('expanded');
            toggleBtn.classList.toggle('expanded', expanded);
            toggleBtn.setAttribute('aria-expanded', String(expanded));
            toggleBtn.innerHTML = expanded
                ? '<span class="arrow">▼</span> 折叠'
                : '<span class="arrow">▼</span> 展开';
        });

        // Insert toggle after the <pre>
        pre.parentNode.insertBefore(toggleBtn, pre.nextSibling);
    });
}

/* ============================================================================ */
/* 5. Quiz Interaction                                                          */
/* ============================================================================ */

function initQuizzes() {
    document.querySelectorAll('.quiz, .quiz-section').forEach((quiz) => {
        const options = quiz.querySelectorAll('.quiz-options li, .quiz-option');
        const explanation = quiz.querySelector('.quiz-explanation');

        options.forEach((option) => {
            option.addEventListener('click', () => {
                // Ignore if already answered
                if (quiz.dataset.answered === 'true') return;

                const isCorrect = option.dataset.correct === 'true';

                // Mark all options
                options.forEach((opt) => {
                    opt.style.pointerEvents = 'none';
                    if (opt.dataset.correct === 'true') {
                        opt.classList.add('correct');
                    }
                });

                // Highlight the selected option
                option.classList.add(isCorrect ? 'correct' : 'selected');
                if (!isCorrect) {
                    option.classList.add('incorrect');
                }

                // Show explanation
                if (explanation) {
                    explanation.classList.add('visible');
                }

                quiz.dataset.answered = 'true';
            });
        });
    });
}

/* ============================================================================ */
/* 6. Full-Text Search                                                          */
/* ============================================================================ */

const SEARCH_INDEX = [];   // Populated via data-chapter elements or inline JSON

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const resultsOverlay = document.getElementById('searchResults');
    const resultsClose = document.getElementById('searchResultsClose');
    const resultsContainer = document.getElementById('searchResultsList');

    if (!searchInput || !resultsOverlay) return;

    // Build index from [data-searchable] elements on the page
    buildSearchIndex();

    let debounceTimer;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query.length < 2) {
                resultsOverlay.classList.remove('visible');
                return;
            }
            performSearch(query, resultsOverlay, resultsContainer);
        }, 250);
    });

    // Close on Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            resultsOverlay.classList.remove('visible');
        }
    });

    if (resultsClose) {
        resultsClose.addEventListener('click', () => {
            resultsOverlay.classList.remove('visible');
        });
    }
}

function buildSearchIndex() {
    SEARCH_INDEX.length = 0;
    document.querySelectorAll('[data-searchable]').forEach((el) => {
        SEARCH_INDEX.push({
            title: el.dataset.title || el.querySelector('h1, h2')?.textContent || '',
            content: el.textContent.trim(),
            id: el.id || '',
        });
    });
}

function performSearch(query, overlay, container) {
    if (!container) return;

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const results = [];

    SEARCH_INDEX.forEach((entry) => {
        const text = entry.content.toLowerCase();
        const allMatch = terms.every((t) => text.includes(t));
        if (!allMatch) return;

        // Build snippet around first match
        let snippet = '';
        const firstTerm = terms[0];
        const idx = text.indexOf(firstTerm);
        if (idx !== -1) {
            const start = Math.max(0, idx - 50);
            const end = Math.min(entry.content.length, idx + firstTerm.length + 100);
            snippet = entry.content.slice(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < entry.content.length) snippet += '...';
        }

        // Count score by number of matching terms
        const score = terms.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
        results.push({ title: entry.title, snippet, score, id: entry.id });
    });

    results.sort((a, b) => b.score - a.score);

    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">未找到匹配结果</p>';
    } else {
        results.forEach((r) => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<div class="result-title">${escapeHtml(r.title)}</div><div class="result-snippet">${highlightTerms(escapeHtml(r.snippet), terms)}</div>`;
            if (r.id) {
                div.addEventListener('click', () => {
                    overlay.classList.remove('visible');
                    document.getElementById(r.id)?.scrollIntoView({ behavior: 'smooth' });
                });
            }
            container.appendChild(div);
        });
    }

    overlay.classList.add('visible');
}

function highlightTerms(text, terms) {
    let result = text;
    terms.forEach((term) => {
        const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
        result = result.replace(regex, '<mark>$1</mark>');
    });
    return result;
}

/* ============================================================================ */
/* 7. Tooltips                                                                  */
/* ============================================================================ */

function initTooltips() {
    document.querySelectorAll('[data-term]').forEach((el) => {
        const term = el.dataset.term;
        if (!term) return;

        el.classList.add('tooltip-term');

        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip-content';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.textContent = term;
        el.appendChild(tooltip);

        // Make focusable for keyboard users
        el.setAttribute('tabindex', '0');
    });
}

/* ============================================================================ */
/* 8. Progress Tracking                                                         */
/* ============================================================================ */

function trackChapterVisit() {
    const chapterEl = document.querySelector('[data-chapter-id]');
    if (!chapterEl) return;

    const chapterId = chapterEl.dataset.chapterId;
    const progress = loadProgress();
    progress.visited = progress.visited || [];

    if (!progress.visited.includes(chapterId)) {
        progress.visited.push(chapterId);
        saveProgress(progress);
    }

    updateProgressBar(progress);
    markVisitedLinks(progress.visited);
}

function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function saveProgress(progress) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
        /* localStorage unavailable — silently ignore */
    }
}

function updateProgressBar(progress) {
    const totalChapters = document.querySelectorAll('.chapter-list li').length;
    if (totalChapters === 0) return;

    const visitedCount = (progress.visited || []).length;
    const pct = Math.min(100, Math.round((visitedCount / totalChapters) * 100));

    const fill = document.querySelector('.progress-fill');
    const label = document.querySelector('.progress-label span:last-child');

    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = `${visitedCount} / ${totalChapters} 章节`;
}

function markVisitedLinks(visited) {
    document.querySelectorAll('.chapter-list a').forEach((link) => {
        const href = link.getAttribute('href');
        if (href && visited.some((id) => href.includes(id))) {
            link.classList.add('visited');
        }
    });
}

/* ============================================================================ */
/* 9. Keyboard Navigation                                                       */
/* ============================================================================ */

function initKeyboardNav() {
    document.addEventListener('keydown', (event) => {
        // Don't hijack typing in inputs
        if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;

        if (event.key === 'ArrowLeft') {
            const prevLink = document.querySelector('.chapter-nav .nav-prev');
            if (prevLink && !prevLink.classList.contains('nav-disabled')) {
                prevLink.click();
            }
        } else if (event.key === 'ArrowRight') {
            const nextLink = document.querySelector('.chapter-nav .nav-next');
            if (nextLink && !nextLink.classList.contains('nav-disabled')) {
                nextLink.click();
            }
        }
    });
}

/* ============================================================================ */
/* 10. Smooth Scroll to Anchors                                                 */
/* ============================================================================ */

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (event) => {
            const targetId = anchor.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (target) {
                event.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.pushState(null, '', '#' + targetId);
            }
        });
    });
}

/* ============================================================================ */
/* 11. Utility Helpers                                                          */
/* ============================================================================ */

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
