import { useMemo, useState } from 'react';
import { Store, Blocks } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import { Spinner, FilterInput } from '@librechat/client';
import { useMCPRegistryQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import MCPRegistryCard from './MCPRegistryCard';

export default function MCPRegistryBrowser() {
  const localize = useLocalize();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { data, isLoading } = useMCPRegistryQuery();

  const servers = data?.servers ?? [];
  const categories = data?.categories ?? [];

  const filtered = useMemo(() => {
    let result = servers;

    // Category filter
    if (activeCategory === 'featured') {
      result = result.filter((s) => s.featured === true);
    } else if (activeCategory !== 'all') {
      result = result.filter((s) => s.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      result = matchSorter(result, searchQuery, {
        keys: ['name', 'description', 'category'],
      });
    }

    return result;
  }, [servers, searchQuery, activeCategory]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Blocks className="h-4 w-4 text-text-secondary" />
        <h3 className="text-sm font-semibold text-text-primary">
          {localize('com_ui_mcp_registry') || 'Integrations'}
        </h3>
        <span className="ml-auto rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
          {servers.length}
        </span>
      </div>

      {/* Search */}
      <FilterInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={localize('com_ui_search') || 'Search integrations...'}
      />

      {/* Category tabs */}
      <div className="scrollbar-thin flex gap-1 overflow-x-auto pb-1">
        <button
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-green-600 text-white'
              : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
          }`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        <button
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeCategory === 'featured'
              ? 'bg-green-600 text-white'
              : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
          }`}
          onClick={() => setActiveCategory('featured')}
        >
          ⭐ Featured
        </button>
        {categories
          .filter((c) => c.id !== 'featured')
          .map((cat) => (
            <button
              key={cat.id}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-green-600 text-white'
                  : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
              }`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
      </div>

      {/* Server grid */}
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-xs text-text-secondary">
          {servers.length === 0
            ? 'No integrations available.'
            : 'No matching integrations found.'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((server) => (
            <MCPRegistryCard key={server.id} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}
