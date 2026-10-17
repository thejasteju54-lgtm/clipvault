import React from 'react';
import { Search, X, Pin, Star, Link, Code, FileText, Image, LayoutGrid } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedFilter: string;
  onFilterChange: (f: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange
}) => {
  const filterTabs = [
    { id: 'All', label: 'All Clips', icon: LayoutGrid },
    { id: 'Pinned', label: 'Pinned', icon: Pin },
    { id: 'Favorites', label: 'Favorites', icon: Star },
    { id: 'URLs', label: 'URLs', icon: Link },
    { id: 'Code', label: 'Code', icon: Code },
    { id: 'Text', label: 'Text', icon: FileText },
    { id: 'Images', label: 'Images', icon: Image }
  ];

  return (
    <div style={{
      maxWidth: '840px',
      margin: '0 auto',
      padding: '16px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Search Input */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '14px',
            color: 'var(--text-dim)'
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by text, URL, tag, or content snippet..."
          style={{
            width: '100%',
            padding: '10px 38px 10px 40px',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            outline: 'none',
            transition: 'var(--transition-fast)'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: '12px',
              color: 'var(--text-dim)'
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {filterTabs.map((tab) => {
          const IconComp = tab.icon;
          const isSelected = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 500,
                borderRadius: 'var(--radius-full)',
                backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-surface)',
                color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                border: isSelected ? '1px solid var(--color-primary-border)' : '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap',
                transition: 'var(--transition-fast)'
              }}
            >
              <IconComp size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
