import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  loadScript,
  loadScriptsSequential,
  runInlineScript,
  clearLegacyScripts,
  normalizeScriptOrder,
} from '../lib/loadScript';
import { rewriteLegacyHtml } from '../lib/rewriteLegacyHtml';

const metaMap = import.meta.glob('../legacy/pages/*/meta.json', { eager: true });
const bodyMap = import.meta.glob('../legacy/pages/*/body.html', { query: '?raw', eager: true });
const styleMap = import.meta.glob('../legacy/pages/*/styles.css', { query: '?raw', eager: true });
const inlineMap = import.meta.glob('../legacy/pages/*/inline.js', { query: '?raw', eager: true });
const moduleMap = import.meta.glob('../legacy/pages/*/module.js', { query: '?raw', eager: true });

function getPageAssets(pageId) {
  const prefix = `../legacy/pages/${pageId}/`;
  const metaEntry = Object.entries(metaMap).find(([k]) => k.startsWith(prefix));
  const bodyEntry = Object.entries(bodyMap).find(([k]) => k.startsWith(prefix));
  const styleEntry = Object.entries(styleMap).find(([k]) => k.startsWith(prefix));
  const inlineEntry = Object.entries(inlineMap).find(([k]) => k.startsWith(prefix));
  const moduleEntry = Object.entries(moduleMap).find(([k]) => k.startsWith(prefix));

  if (!metaEntry) throw new Error(`Unknown page: ${pageId}`);

  return {
    meta: metaEntry[1].default,
    body: bodyEntry?.[1]?.default ?? '',
    styles: styleEntry?.[1]?.default ?? '',
    inline: inlineEntry?.[1]?.default ?? '',
    mod: moduleEntry?.[1]?.default ?? null,
  };
}

export default function LegacyPage({ pageId }) {
  const containerRef = useRef(null);
  const styleRef = useRef(null);
  const location = useLocation();
  const [error, setError] = useState(null);
  const initKey = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const key = ++initKey.current;

    async function mount() {
      setError(null);
      clearLegacyScripts();

      try {
        const { meta, body, styles, inline, mod } = getPageAssets(pageId);
        if (cancelled || key !== initKey.current) return;

        document.title = meta.title;

        if (styleRef.current) styleRef.current.remove();
        const styleEl = document.createElement('style');
        styleEl.dataset.legacyPage = pageId;
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        styleRef.current = styleEl;

        for (const href of meta.linkCss || []) {
          const linkId = `legacy-link-${pageId}-${href.replace(/\W/g, '_')}`;
          if (!document.getElementById(linkId)) {
            const link = document.createElement('link');
            link.id = linkId;
            link.rel = 'stylesheet';
            link.href = href.startsWith('/') ? href : `/${href}`;
            document.head.appendChild(link);
          }
        }

        if (containerRef.current) {
          containerRef.current.innerHTML = rewriteLegacyHtml(body);
        }

        const scripts = normalizeScriptOrder(meta.externalScripts || []);
        await loadScriptsSequential(scripts);
        if (cancelled || key !== initKey.current) return;

        if (mod) {
          const blob = new Blob([mod], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await loadScript(url, 'module');
          URL.revokeObjectURL(url);
        }

        if (inline) {
          const blob = new Blob([inline], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await loadScript(url);
          URL.revokeObjectURL(url);
        }

        if (typeof window.initSidebar === 'function') {
          window.initSidebar();
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setError(e.message);
        }
      }
    }

    mount();

    return () => {
      cancelled = true;
      clearLegacyScripts();
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [pageId, location.pathname, location.search]);

  if (error) {
    return (
      <div style={{ padding: 24, color: '#e8e8e8' }}>
        페이지 로드 오류: {error}
      </div>
    );
  }

  return <div ref={containerRef} className="legacy-page-root" />;
}
