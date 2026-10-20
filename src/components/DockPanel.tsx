import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GripHorizontal, Minimize2, Maximize2, RotateCcw } from 'lucide-react';
export default function DockPanel({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false),
    [full, setFull] = useState(false);
  const panel = useRef<HTMLElement>(null),
    drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ass-panel-layout') ?? 'null');
      if (saved && panel.current && innerWidth > 760) {
        if (saved.width)
          panel.current.style.width = `${Math.max(225, Math.min(420, saved.width))}px`;
        if (Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
          const p = panel.current,
            parent = p.parentElement!;
          p.style.left = `${Math.max(0, Math.min(parent.clientWidth - p.offsetWidth, saved.left))}px`;
          p.style.top = `${Math.max(0, Math.min(parent.clientHeight - 160, saved.top))}px`;
          p.style.right = 'auto';
        }
      }
    } catch {
      /* Default dock remains available. */
    }
    const element = panel.current!;
    const observer = new ResizeObserver(() => {
      if (innerWidth > 760)
        try {
          localStorage.setItem(
            'ass-panel-layout',
            JSON.stringify({
              width: element.offsetWidth,
              left: element.style.left ? parseFloat(element.style.left) : undefined,
              top: element.style.top ? parseFloat(element.style.top) : undefined,
            }),
          );
        } catch {
          /* Session-only layout. */
        }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <aside
      ref={panel}
      className={`planet-inspector panel dock-panel ${collapsed ? 'dock-collapsed' : ''} ${full ? 'dock-full' : ''}`}
      aria-label="Planet inspector"
    >
      <div
        className="dock-handle"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          const r = panel.current!.getBoundingClientRect(),
            parent = panel.current!.parentElement!.getBoundingClientRect();
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: r.left - parent.left,
            top: r.top - parent.top,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current || !panel.current) return;
          if (innerWidth <= 760) {
            panel.current.style.transform = `translateY(${(e.clientY - drag.current.y) * 0.15}px)`;
            return;
          }
          const p = panel.current,
            parent = p.parentElement!,
            left = Math.max(
              0,
              Math.min(
                parent.clientWidth - p.offsetWidth,
                drag.current.left + e.clientX - drag.current.x,
              ),
            ),
            top = Math.max(
              0,
              Math.min(parent.clientHeight - 160, drag.current.top + e.clientY - drag.current.y),
            );
          p.style.left = `${left}px`;
          p.style.right = 'auto';
          p.style.top = `${top}px`;
        }}
        onPointerUp={(e) => {
          if (drag.current && innerWidth <= 760) {
            const delta = e.clientY - drag.current.y;
            if (delta < -45) {
              setFull(true);
              setCollapsed(false);
            } else if (delta > 45) {
              if (full) setFull(false);
              else setCollapsed(true);
            }
            panel.current!.style.transform = '';
          }
          if (drag.current && innerWidth > 760 && panel.current) {
            const p = panel.current;
            try {
              localStorage.setItem(
                'ass-panel-layout',
                JSON.stringify({
                  width: p.offsetWidth,
                  left: parseFloat(p.style.left),
                  top: parseFloat(p.style.top),
                }),
              );
            } catch {
              /* Session-only layout. */
            }
          }
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
          if (panel.current) panel.current.style.transform = '';
        }}
      >
        <GripHorizontal size={13} />
        <span>PLANET INSPECTOR</span>
        <button
          aria-label="Reset inspector dock"
          onClick={() => {
            const p = panel.current!;
            p.style.left = '';
            p.style.right = '';
            p.style.top = '';
            p.style.width = '';
            localStorage.removeItem('ass-panel-layout');
            setFull(false);
            setCollapsed(false);
          }}
        >
          <RotateCcw size={12} />
        </button>
        <button
          aria-label="Expand inspector"
          onClick={() => {
            setFull(!full);
            setCollapsed(false);
          }}
        >
          <Maximize2 size={12} />
        </button>
        <button
          aria-label={collapsed ? 'Open inspector' : 'Collapse inspector'}
          onClick={() => setCollapsed(!collapsed)}
        >
          <Minimize2 size={12} />
        </button>
      </div>
      <div className="dock-content">{children}</div>
    </aside>
  );
}
