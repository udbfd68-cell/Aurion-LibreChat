import { useMemo, useState } from 'react';
import { Search, Plug2, Zap, Star, Shield, Loader2, AlertCircle, Server } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import ConnectorCard from './ConnectorCard';
import { getIcon } from './iconMap';
import { useMCPConnectors } from './useMCPConnectors';
import { MCP_SERVERS, MCP_CATEGORIES } from './registryData';

export default function ConnectorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { connectedCount, isConnected, isLoading, isBackendAvailable, connectedServers } =
    useMCPConnectors();

  const servers = MCP_SERVERS;
  const categories = MCP_CATEGORIES;

  const filtered = useMemo(() => {
    let result = servers;
    if (activeCategory === 'featured') {
      result = result.filter((s) => s.featured);
    } else if (activeCategory === 'connected') {
      result = result.filter((s) => isConnected(s.id));
    } else if (activeCategory !== 'all') {
      result = result.filter((s) => s.category === activeCategory);
    }
    if (searchQuery.trim()) {
      result = matchSorter(result, searchQuery, {
        keys: ['name', 'description', 'category'],
      });
    }
    return result;
  }, [servers, searchQuery, activeCategory, isConnected]);

  const grouped = useMemo(() => {
    if (activeCategory !== 'all') {
      return { [activeCategory]: filtered };
    }
    const groups: Record<string, typeof filtered> = {};
    for (const server of filtered) {
      const cat = server.category || 'other';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(server);
    }
    return groups;
  }, [filtered, activeCategory]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-light bg-surface-primary-alt px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-tertiary">
            <Plug2 className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Integrations</h1>
            <p className="text-xs text-text-secondary">
              Connect MCP servers to use their tools in conversations
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isBackendAvailable && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                <AlertCircle className="h-3 w-3" />
                Backend offline
              </span>
            )}
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
            )}
            {connectedCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {connectedCount} active
              </span>
            )}
            <span className="rounded-full bg-surface-tertiary px-3 py-1 text-xs font-medium text-text-secondary">
              {servers.length} available
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations..."
            className="w-full rounded-lg border border-border-medium bg-surface-primary py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-heavy focus:outline-none focus:ring-1 focus:ring-border-heavy"
          />
        </div>

        {/* Tabs */}
        <div className="scrollbar-thin mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <button
            className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-text-primary text-surface-primary'
                : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => setActiveCategory('all')}
          >
            <Zap className="h-3 w-3" />
            All
          </button>
          {connectedCount > 0 && (
            <button
              className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === 'connected'
                  ? 'bg-text-primary text-surface-primary'
                  : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
              }`}
              onClick={() => setActiveCategory('connected')}
            >
              <div className="h-2 w-2 rounded-full bg-green-500" />
              Connected ({connectedCount})
            </button>
          )}
          <button
            className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategory === 'featured'
                ? 'bg-text-primary text-surface-primary'
                : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
            }`}
            onClick={() => setActiveCategory('featured')}
          >
            <Star className="h-3 w-3" />
            Featured
          </button>
          {categories
            .filter((cat) => cat.id !== 'featured')
            .map((cat) => {
              const CatIcon = getIcon(cat.icon);
              return (
                <button
                  key={cat.id}
                  className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-text-primary text-surface-primary'
                      : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover'
                  }`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <CatIcon className="h-3 w-3" />
                  {cat.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* Connector list */}
      <div className="flex-1 overflow-y-auto p-6">
        {Object.entries(grouped).map(([catId, catServers]) => {
          const cat = categories.find((c) => c.id === catId);
          const CatIcon = getIcon(cat?.icon || 'plug-2');
          return (
            <div key={catId} className="mb-6">
              {activeCategory === 'all' && (
                <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  <CatIcon className="h-3.5 w-3.5" />
                  {cat?.name || catId}
                  <span className="font-normal">({catServers.length})</span>
                </h2>
              )}
              <div className="space-y-2">
                {catServers.map((server) => (
                  <ConnectorCard key={server.id} server={server} />
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="mb-3 h-12 w-12 text-text-tertiary opacity-40" />
            <p className="text-sm text-text-secondary">No integrations found</p>
            <p className="text-xs text-text-tertiary">Try a different search or category</p>
          </div>
        )}
      </div>
    </div>
  );
}
