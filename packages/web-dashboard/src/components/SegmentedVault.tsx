import React, { useState } from 'react';
import { ClipboardItem } from '@clipvault/shared';
import { ItemCard } from './ItemCard';
import { Image, Link, Code, FileText, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';

interface SegmentedVaultProps {
  items: ClipboardItem[];
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

export const SegmentedVault: React.FC<SegmentedVaultProps> = ({
  items,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  onManualSync,
  isSyncing
}) => {
  // Collapsible state for each segment
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    image: false,
    url: false,
    code: false,
    text: false
  });

  const toggleSegment = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const images = items.filter((i) => i.contentType === 'image');
  const urls = items.filter((i) => i.contentType === 'url');
  const code = items.filter((i) => i.contentType === 'code');
  const text = items.filter((i) => i.contentType === 'text' || i.contentType === 'rich_text');

  const segments = [
    {
      key: 'image',
      title: 'Screenshots & Images',
      icon: Image,
      badgeColor: '#E65100',
      badgeBg: 'rgba(230, 81, 0, 0.12)',
      items: images,
      emptyHint: 'Screenshots and graphics you copy or import will automatically land here.'
    },
    {
      key: 'url',
      title: 'Links & Web Resources',
      icon: Link,
      badgeColor: '#1976D2',
      badgeBg: 'rgba(25, 118, 210, 0.12)',
      items: urls,
      emptyHint: 'Copied web links, articles, and URLs will automatically land here.'
    },
    {
      key: 'code',
      title: 'Code & Snippets',
      icon: Code,
      badgeColor: '#7B1FA2',
      badgeBg: 'rgba(123, 31, 162, 0.12)',
      items: code,
      emptyHint: 'Programming code snippets, JSON, and commands will automatically land here.'
    },
    {
      key: 'text',
      title: 'Plain Text & Notes',
      icon: FileText,
      badgeColor: 'var(--color-primary)',
      badgeBg: 'var(--color-primary-light)',
      items: text,
      emptyHint: 'General notes, copied messages, and text will automatically land here.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {segments.map((seg) => {
        const IconComp = seg.icon;
        const isCollapsed = collapsed[seg.key];
        const count = seg.items.length;

        return (
          <section
            key={seg.key}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Segment Header Bar */}
            <div
              onClick={() => toggleSegment(seg.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)',
                userSelect: 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: seg.badgeBg,
                  color: seg.badgeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComp size={18} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  {seg.title}
                </h3>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: count > 0 ? seg.badgeBg : 'var(--bg-canvas)',
                  color: count > 0 ? seg.badgeColor : 'var(--text-dim)',
                  border: `1px solid ${count > 0 ? 'rgba(255, 255, 255, 0.05)' : 'var(--border-subtle)'}`
                }}>
                  {count} {count === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)' }}>
                {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {/* Segment Content */}
            {!isCollapsed && (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {count === 0 ? (
                  <div style={{
                    padding: '28px 16px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-canvas)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border-subtle)'
                  }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {seg.emptyHint}
                    </p>
                    {onManualSync && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onManualSync();
                        }}
                        disabled={isSyncing}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: seg.badgeColor,
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: seg.badgeBg
                        }}
                      >
                        <Sparkles size={13} />
                        <span>Auto-Fetch Now</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {seg.items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        onTogglePin={onTogglePin}
                        onToggleFavorite={onToggleFavorite}
                        onDelete={onDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
