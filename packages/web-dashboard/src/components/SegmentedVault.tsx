import React, { useState } from 'react';
import { ClipboardItem } from '@clipvault/shared';
import { ItemCard } from './ItemCard';
import { Link, Code, FileText, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';

interface SegmentedVaultProps {
  items: ClipboardItem[];
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleOpened: (id: string) => void;
}

export const SegmentedVault: React.FC<SegmentedVaultProps> = ({
  items,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  onToggleOpened
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    url: false,
    text: false,
    code: false
  });

  const [linkSubFilter, setLinkSubFilter] = useState<'all' | 'unopened' | 'opened'>('all');

  const toggleSegment = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allUrls = items.filter((i) => i.contentType === 'url' || !!i.detectedUrl);
  const unopenedUrls = allUrls.filter((i) => !i.isOpened);
  const openedUrls = allUrls.filter((i) => !!i.isOpened);

  const filteredUrls = linkSubFilter === 'unopened'
    ? unopenedUrls
    : linkSubFilter === 'opened'
      ? openedUrls
      : allUrls;

  const textItems = items.filter((i) => i.contentType === 'text' || i.contentType === 'rich_text');
  const codeItems = items.filter((i) => i.contentType === 'code');

  const segments = [
    {
      key: 'url',
      title: 'Links & Web Resources',
      icon: Link,
      accentColor: 'var(--color-link-unopened)',
      badgeBg: 'var(--color-link-unopened-bg)',
      items: filteredUrls,
      totalCount: allUrls.length,
      isLinkSegment: true,
      emptyHint: 'Copied web links and URLs will automatically land here.'
    },
    {
      key: 'text',
      title: 'Notes & Plain Text',
      icon: FileText,
      accentColor: 'var(--color-primary)',
      badgeBg: 'var(--color-primary-light)',
      items: textItems,
      totalCount: textItems.length,
      isLinkSegment: false,
      emptyHint: 'Copied text, messages, and notes will automatically land here.'
    },
    {
      key: 'code',
      title: 'Code & Snippets',
      icon: Code,
      accentColor: '#A855F7',
      badgeBg: 'rgba(168, 85, 247, 0.12)',
      items: codeItems,
      totalCount: codeItems.length,
      isLinkSegment: false,
      emptyHint: 'Programming code, JSON, and commands will automatically land here.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {segments.map((seg) => {
        const IconComp = seg.icon;
        const isCollapsed = collapsed[seg.key];

        return (
          <section
            key={seg.key}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden'
            }}
          >
            {/* Minimalist Segment Header */}
            <div
              onClick={() => toggleSegment(seg.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-surface)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconComp size={16} color={seg.accentColor} />
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>
                  {seg.title}
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: seg.totalCount > 0 ? seg.badgeBg : 'var(--bg-canvas)',
                  color: seg.totalCount > 0 ? seg.accentColor : 'var(--text-dim)'
                }}>
                  {seg.totalCount}
                </span>
              </div>

              <div style={{ color: 'var(--text-dim)' }}>
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* If Link Segment, show Opened vs Unopened Sub-Filter Bar */}
            {!isCollapsed && seg.isLinkSegment && allUrls.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--bg-canvas)',
                borderBottom: '1px solid var(--border-subtle)',
                overflowX: 'auto'
              }}>
                <button
                  type="button"
                  onClick={() => setLinkSubFilter('all')}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: linkSubFilter === 'all' ? 700 : 500,
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: linkSubFilter === 'all' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: linkSubFilter === 'all' ? 'var(--text-main)' : 'var(--text-muted)',
                    border: linkSubFilter === 'all' ? '1px solid var(--border-subtle)' : '1px solid transparent'
                  }}
                >
                  All ({allUrls.length})
                </button>

                <button
                  type="button"
                  onClick={() => setLinkSubFilter('unopened')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: linkSubFilter === 'unopened' ? 700 : 500,
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: linkSubFilter === 'unopened' ? 'var(--color-link-unopened-bg)' : 'transparent',
                    color: linkSubFilter === 'unopened' ? 'var(--color-link-unopened)' : 'var(--text-muted)',
                    border: linkSubFilter === 'unopened' ? '1px solid var(--color-link-unopened-border)' : '1px solid transparent'
                  }}
                >
                  <Circle size={7} fill="currentColor" />
                  <span>Unopened ({unopenedUrls.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLinkSubFilter('opened')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: linkSubFilter === 'opened' ? 700 : 500,
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: linkSubFilter === 'opened' ? 'var(--color-link-opened-bg)' : 'transparent',
                    color: linkSubFilter === 'opened' ? 'var(--color-link-opened)' : 'var(--text-muted)',
                    border: linkSubFilter === 'opened' ? '1px solid var(--color-link-opened-border)' : '1px solid transparent'
                  }}
                >
                  <CheckCircle2 size={10} />
                  <span>Opened ({openedUrls.length})</span>
                </button>
              </div>
            )}

            {/* Segment Items List */}
            {!isCollapsed && (
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {seg.items.length === 0 ? (
                  <div style={{
                    padding: '20px 14px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-canvas)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-subtle)'
                  }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {seg.emptyHint}
                    </p>
                  </div>
                ) : (
                  seg.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onTogglePin={onTogglePin}
                      onToggleFavorite={onToggleFavorite}
                      onDelete={onDelete}
                      onToggleOpened={onToggleOpened}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
