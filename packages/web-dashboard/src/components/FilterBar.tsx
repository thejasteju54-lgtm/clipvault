import React from 'react';
import { Search, X, Pin, Star, Link, Code, FileText, LayoutGrid } from 'lucide-react';

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
    { id: 'All', label: 'All', icon: LayoutGrid },
    { id: 'URLs', label: 'Links', icon: Link },
    { id: 'Text', label: 'Notes', icon: FileText },
    { id: 'Code', label: 'Code', icon: Code },
    { id: 'Pinned', label: 'Pinned', icon: Pin },
    { id: 'Favorites', label: 'Starred', icon: Star }
  ];

  return (
    <div style={{
      maxWidth: '840px',
      margin: '0 auto',
      padding: '10px 16px 8px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Search Input */}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Search
          size={14}
          style={{
            position: 'absolute',
            left: '12px',
            color: 'var(--text-dim)'
          }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search clips..."
          style={{
            width: '100%',
            padding: '8px 32px 8px 34px',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12.5px',
            outline: 'none',
            transition: 'var(--transition-fast)'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{
              position: 'absolute',
              right: '10px',
              color: 'var(--text-dim)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '2px',
        scrollbarWidth: 'none'
      }}>
        {filterTabs.map((tab) => {
          const IconComp = tab.icon;
          const isSelected = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: isSelected ? 600 : 500,
                borderRadius: 'var(--radius-full)',
                backgroundColor: isSelected ? 'var(--color-primary-light)' : 'var(--bg-surface)',
                color: isSelected ? 'var(--color-primary)' : 'var(--text-muted)',
                border: isSelected ? '1px solid var(--color-primary-border)' : '1px solid var(--border-subtle)',
                whiteSpace: 'nowrap',
                transition: 'var(--transition-fast)'
              }}
            >
              <IconComp size={12} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
