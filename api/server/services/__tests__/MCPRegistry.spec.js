const { MCP_REGISTRY, CATEGORIES } = require('../MCPRegistry');

describe('MCPRegistry', () => {
  it('exports a non-empty array of servers', () => {
    expect(Array.isArray(MCP_REGISTRY)).toBe(true);
    expect(MCP_REGISTRY.length).toBeGreaterThan(30);
  });

  it('every server has required fields', () => {
    for (const server of MCP_REGISTRY) {
      expect(server).toHaveProperty('id');
      expect(server).toHaveProperty('name');
      expect(server).toHaveProperty('description');
      expect(server).toHaveProperty('category');
      expect(server).toHaveProperty('command');
      expect(server).toHaveProperty('args');
      expect(typeof server.id).toBe('string');
      expect(typeof server.name).toBe('string');
      expect(typeof server.description).toBe('string');
      expect(typeof server.category).toBe('string');
      expect(typeof server.command).toBe('string');
      expect(Array.isArray(server.args)).toBe(true);
    }
  });

  it('every server has docsUrl and icon', () => {
    for (const server of MCP_REGISTRY) {
      expect(server).toHaveProperty('docsUrl');
      expect(server).toHaveProperty('icon');
      expect(typeof server.docsUrl).toBe('string');
      expect(server.docsUrl).toMatch(/^https:\/\//);
    }
  });

  it('all server IDs are unique', () => {
    const ids = MCP_REGISTRY.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every server category is in CATEGORIES', () => {
    const validCategories = CATEGORIES.map((c) => c.id);
    for (const server of MCP_REGISTRY) {
      expect(validCategories).toContain(server.category);
    }
  });

  it('exports categories with required fields', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThan(10);
    for (const cat of CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('icon');
      expect(typeof cat.id).toBe('string');
      expect(typeof cat.name).toBe('string');
    }
  });

  it('category IDs are unique', () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('contains official MCP servers', () => {
    const ids = MCP_REGISTRY.map((s) => s.id);
    expect(ids).toContain('github');
    expect(ids).toContain('filesystem');
    expect(ids).toContain('brave-search');
    expect(ids).toContain('postgres');
    expect(ids).toContain('puppeteer');
    expect(ids).toContain('memory');
    expect(ids).toContain('sequential-thinking');
    expect(ids).toContain('fetch');
    expect(ids).toContain('slack');
    expect(ids).toContain('gitlab');
    expect(ids).toContain('google-drive');
  });

  it('contains popular community servers', () => {
    const ids = MCP_REGISTRY.map((s) => s.id);
    expect(ids).toContain('notion');
    expect(ids).toContain('stripe');
    expect(ids).toContain('figma');
    expect(ids).toContain('exa');
    expect(ids).toContain('tavily');
    expect(ids).toContain('supabase');
    expect(ids).toContain('cloudflare');
  });

  it('has featured servers', () => {
    const featured = MCP_REGISTRY.filter((s) => s.featured === true);
    expect(featured.length).toBeGreaterThan(5);
    const featuredIds = featured.map((s) => s.id);
    expect(featuredIds).toContain('github');
    expect(featuredIds).toContain('notion');
  });

  it('requiredEnv is always an array', () => {
    for (const server of MCP_REGISTRY) {
      if (server.requiredEnv !== undefined) {
        expect(Array.isArray(server.requiredEnv)).toBe(true);
      }
    }
  });
});
