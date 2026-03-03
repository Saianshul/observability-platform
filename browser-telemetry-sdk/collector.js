const collector = (function () {
    'use strict';

    let config = {};
    let initialized = false;
    const globalProps = {};

    const defaults = {
        endpoint: 'https://collector.saianshulv.site/log',
        enableTechnographics: true,
        enableTiming: true,
        enableVitals: true,
        enableErrors: true,
        enableActivity: true,
        sampleRate: 1.0,
        debug: false
    };

    let errorCount = 0;
    const MAX_ERRORS = 10;
    const reportedErrors = new Set();

    let lcpObserver;
    let clsObserver;
    let inpObserver;

    let lcpValue = 0;
    let clsValue = 0;
    let inpValue = 0;

    const FRAME_DURATION_MS = 16;

    const vitalsThresholds = {
        lcp: [2500, 4000],
        cls: [0.1, 0.25],
        inp: [200, 500]
    };

    const MAX_BUFFER_SIZE = 50;
    const IDLE_TIMEOUT_MS = 2000;
    const MOUSEMOVE_RECORD_INTERVAL_MS = 500;

    const COOKIE_EXPIRATION_S = 86400;

    function init(options) {
        if (initialized) {
            warn('collector.init() called more than once');
            return;
        }

        config = {};

        for (const key of Object.keys(defaults)) {
            config[key] = (options && options[key] !== undefined) ? options[key] : defaults[key];
        }

        // Sampling: decide once per session whether to collect
        if (!shouldSample()) {
            log(`Session not sampled (rate: ${config.sampleRate})`);
            return;
        }

        initialized = true;

        if (config.enableErrors) {
            initErrorTracking();
        }

        if (config.enableVitals) {
            initVitalsObservers();
        }

        if (config.enableActivity) {
            initActivityTracking();
        }

        function firePageview() {
            setTimeout(() => {
                checkImagesEnabled(imagesEnabled => {
                    const payload = buildPayload('pageview');

                    if (config.enableTechnographics) {
                        payload.technographics = getTechnographics();
                        payload.technographics.imagesEnabled = imagesEnabled;
                    }

                    if (config.enableTiming) {
                        payload.timing = getNavigationTiming();
                        payload.resources = getResourceSummary();
                    }

                    send(payload);
                });
            }, 0);
        }

        if (document.readyState === 'complete') {
            firePageview();
        } else {
            window.addEventListener('load', firePageview);
        }

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                const payload = buildPayload('vitals');

                payload.vitals = {
                    lcp: { value: round(lcpValue), score: getVitalsScore('lcp', lcpValue) },
                    cls: { value: Math.round(clsValue * 1000) / 1000, score: getVitalsScore('cls', clsValue) },
                    inp: { value: round(inpValue), score: getVitalsScore('inp', inpValue) }
                };

                send(payload);
            }
        });

        log('Collector initialized', config);
    }

    function shouldSample() {
        const sampled = sessionStorage.getItem('_collector_sampled');

        if (sampled !== null) {
            return sampled === 'true';
        }

        const result = Math.random() < config.sampleRate;
        sessionStorage.setItem('_collector_sampled', String(result));

        return result;
    }

    function initErrorTracking() {
        window.addEventListener('error', e => {
            if (e instanceof ErrorEvent) {
                reportError({
                    type: 'js-error',
                    message: e.message,
                    source: e.filename,
                    line: e.lineno,
                    column: e.colno,
                    stack: e.error ? e.error.stack : '',
                    url: window.location.href
                });
            }
        });

        window.addEventListener('unhandledrejection', e => {
            const reason = e.reason;

            reportError({
                type: 'promise-rejection',
                message: reason instanceof Error ? reason.message : String(reason),
                stack: reason instanceof Error ? reason.stack : '',
                url: window.location.href
            });
        });

        window.addEventListener('error', e => {
            // Resource errors bubble up as plain Events (not ErrorEvent)
            if (!(e instanceof ErrorEvent)) {
                const target = e.target;

                if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
                    reportError({
                        type: 'resource-error',
                        tagName: target.tagName,
                        src: target.src || target.href || '',
                        url: window.location.href
                    });
                }
            }
        }, true); // Use capturing phase instead of default bubbling phase

        log('Error tracking initialized');
    }

    function reportError(errorData) {
        if (errorCount >= MAX_ERRORS) {
            return;
        }            

        const key = `${errorData.type}:${errorData.message}:${errorData.source || ''}:${errorData.line || ''}`;

        if (reportedErrors.has(key)) {
            return;
        }

        reportedErrors.add(key);
        errorCount++;

        send({
            type: 'error',
            error: errorData,
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
    }

    function initVitalsObservers() {
        if (!('PerformanceObserver' in window)) {
            return;
        }
        
        lcpObserver = new PerformanceObserver(list => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcpValue = lastEntry.renderTime || lastEntry.loadTime;
        });

        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

        clsObserver = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
        });

        clsObserver.observe({ type: 'layout-shift', buffered: true });

        inpObserver = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) {
                // Event entries with interactionId represent user interactions
                if (entry.interactionId) {
                    inpValue = Math.max(inpValue, entry.duration);
                }
            }
        });

        // Captures interactions taking more than one frame (60 fps)
        inpObserver.observe({ type: 'event', buffered: true, durationThreshold: FRAME_DURATION_MS });

        log('Vitals observers initialized');
    }

    function initActivityTracking() {
        const activityBuffer = [];

        function flush() {
            if (activityBuffer.length === 0) {
                return;
            }

            send({
                type: 'activity',
                url: window.location.href,
                activities: activityBuffer.splice(0, activityBuffer.length)
            });
        }

        function record(e) {
            activityBuffer.push({
                ...e,
                timestamp: new Date().toISOString()
            });

            if (activityBuffer.length >= MAX_BUFFER_SIZE) {
                flush();
            }
        }

        let idleStart = null;
        let idleTimer = null;

        function resetIdleTimer() {
            if (idleStart !== null) {
                record({
                    type: 'idle-end',
                    idleDuration: Date.now() - idleStart
                });

                idleStart = null;
            }

            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                idleStart = Date.now();
            }, IDLE_TIMEOUT_MS);
        }        

        let lastMousemove = 0;

        document.addEventListener('mousemove', e => {
            const now = Date.now();

            if (now - lastMousemove > MOUSEMOVE_RECORD_INTERVAL_MS) {
                record({
                    type: 'mousemove',
                    x: e.clientX,
                    y: e.clientY
                });

                lastMousemove = now;
            }

            resetIdleTimer();
        });

        document.addEventListener('mousedown', e => {
            record({
                type: 'click',
                x: e.clientX,
                y: e.clientY,
                button: e.button // 0 = left, 1 = middle, 2 = right
            });

            resetIdleTimer();
        });

        document.addEventListener('scroll', () => {
            record({
                type: 'scroll',
                scrollX: window.scrollX,
                scrollY: window.scrollY
            });

            resetIdleTimer();
        });

        document.addEventListener('keydown', e => {
            record({
                type: 'keydown',
                key: e.key,
                code: e.code
            });

            resetIdleTimer();
        });

        document.addEventListener('keyup', e => {
            record({
                type: 'keyup',
                key: e.key,
                code: e.code
            });

            resetIdleTimer();
        });

        record({
            type: 'page-enter',
            page: window.location.href
        });

        window.addEventListener('beforeunload', () => {
            record({
                type: 'page-leave',
                page: window.location.href
            });

            flush();
        });

        log('Activity tracking initialized');
    }
    
    function checkImagesEnabled(callback) {
        const img = new Image();
        img.onload = () => callback(true);
        img.onerror = () => callback(false);
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }

    function getSessionId() {
        let sid = sessionStorage.getItem('_collector_sid');

        if (!sid) {
            sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
            sessionStorage.setItem('_collector_sid', sid);
            document.cookie = `_collector_sid=${sid}; path=/; max-age=${COOKIE_EXPIRATION_S}; Secure`;
        }

        return sid;
    }

    function getTechnographics() {
        let networkInfo = {};

        if ('connection' in navigator) {
            const conn = navigator.connection;
            networkInfo = {
                effectiveType: conn.effectiveType,
                downlink: conn.downlink,
                rtt: conn.rtt,
                saveData: conn.saveData
            };
        }

        let cssEnabled = false;

        if (document.body) {
            const testDiv = document.createElement('div');
            testDiv.style.display = 'none';
            document.body.appendChild(testDiv);
            cssEnabled = window.getComputedStyle(testDiv).display === 'none';
            document.body.removeChild(testDiv);
        }

        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            pixelRatio: window.devicePixelRatio,
            cores: navigator.hardwareConcurrency || 0,
            memory: navigator.deviceMemory || 0,
            network: networkInfo,
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            cssEnabled,
            jsEnabled: true
        };
    }

    function getNavigationTiming() {
        const entries = performance.getEntriesByType('navigation');

        if (!entries.length) {
            return {};
        }

        const n = entries[0];

        return {
            timingObject: n.toJSON(),
            pageStart: n.fetchStart,
            pageEnd: n.loadEventEnd,
            dnsLookup: round(n.domainLookupEnd - n.domainLookupStart),
            tcpConnect: round(n.connectEnd - n.connectStart),
            tlsHandshake: n.secureConnectionStart > 0 ? round(n.connectEnd - n.secureConnectionStart) : 0,
            ttfb: round(n.responseStart - n.requestStart),
            download: round(n.responseEnd - n.responseStart),
            domInteractive: round(n.domInteractive - n.fetchStart), // DOM interactive (HTML parsed, not all resources loaded)
            domComplete: round(n.domComplete - n.fetchStart), // DOM complete (all resources loaded)
            totalLoadTime: round(n.loadEventEnd - n.fetchStart), // Full page load
            fetchTime: round(n.responseEnd - n.fetchStart),
            headerSize: n.transferSize - n.encodedBodySize
        };
    }

    function round(n) {
        return Math.round(n * 100) / 100;
    }

    function getResourceSummary() {
        const resources = performance.getEntriesByType('resource');

        const summary = {
            script: { count: 0, totalSize: 0, totalDuration: 0 },
            link: { count: 0, totalSize: 0, totalDuration: 0 }, // CSS
            img: { count: 0, totalSize: 0, totalDuration: 0 },
            font: { count: 0, totalSize: 0, totalDuration: 0 },
            fetch: { count: 0, totalSize: 0, totalDuration: 0 },
            xmlhttprequest: { count: 0, totalSize: 0, totalDuration: 0 },
            other: { count: 0, totalSize: 0, totalDuration: 0 }
        };

        resources.forEach(r => {
            const type = summary[r.initiatorType] ? r.initiatorType : 'other';
            summary[type].count++;
            summary[type].totalSize += r.transferSize || 0;
            summary[type].totalDuration += r.duration || 0;
        });

        return {
            totalResources: resources.length,
            byType: summary
        };
    }

    function getVitalsScore(metric, value) {
        const t = vitalsThresholds[metric];

        if (!t) {
            return null;
        }

        if (value <= t[0]) {
            return 'good';
        }

        if (value <= t[1]) {
            return 'needsImprovement';
        }

        return 'poor';
    }

    function buildPayload(eventName) {
        const payload = {
            type: eventName,
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
            session: getSessionId()
        };

        for (const k of Object.keys(globalProps)) {
            payload[k] = globalProps[k];
        }

        return payload;
    }

    function send(payload) {
        if (config.debug) {
            console.log('[Collector] Would send:', payload);
            return;
        }

        const json = JSON.stringify(payload);
        const blob = new Blob([json], { type: 'application/json' });

        // Strategy 1: sendBeacon (preferred — survives unload)
        if (navigator.sendBeacon) {
            const sent = navigator.sendBeacon(config.endpoint, blob);

            if (sent) {
                return;
            }
        }

        // Strategy 2: fetch with keepalive (survives unload, has response)
        fetch(config.endpoint, {
            method: 'POST',
            body: json,
            headers: { 'Content-Type': 'application/json' },
            keepalive: true
        }).catch(() => {
            // Strategy 3: plain fetch (last resort)
            fetch(config.endpoint, {
                method: 'POST',
                body: json,
                headers: { 'Content-Type': 'application/json' }
            }).catch(() => { });
        });
    }

    function track(eventName, data) {
        if (!initialized) {
            warn('collector.track() called before init()');
            return;
        }

        const payload = buildPayload(eventName);

        if (data) {
            payload.data = data;
        }

        send(payload);
    }

    function set(key, value) {
        globalProps[key] = value;
    }

    function identify(userId) {
        globalProps.userId = userId;
        log('User identified:', userId);
    }

    function log(...args) {
        if (config.debug) {
            console.log('[Collector]', ...args);
        }
    }

    function warn(...args) {
        console.warn('[Collector]', ...args);
    }

    return {
        init,
        track,
        set,
        identify
    };
})();
