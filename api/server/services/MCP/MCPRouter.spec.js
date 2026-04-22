const { route, getAvailableServers } = require('./MCPRouter');

describe('MCPRouter.route', () => {
  it('returns [] for empty / whitespace input', () => {
    expect(route('')).toEqual([]);
    expect(route('   ')).toEqual([]);
    expect(route(null)).toEqual([]);
    expect(route(undefined)).toEqual([]);
  });

  it('returns [] for a simple greeting', () => {
    expect(route('bonjour')).toEqual([]);
    expect(route('hello')).toEqual([]);
    expect(route('salut comment vas-tu ?')).toEqual([]);
  });

  it('activates gmail for email-related messages (FR + EN)', () => {
    expect(route('Envoie un email a toute mon equipe')).toContain('gmail');
    expect(route('Please send email to bob@example.com')).toContain('gmail');
    expect(route('Réponds à ce mail urgent')).toContain('gmail');
  });

  it('activates google-calendar for scheduling messages', () => {
    expect(route('Organise une réunion demain matin')).toContain('google-calendar');
    expect(route('Schedule a meeting next week')).toContain('google-calendar');
    expect(route('Quelle est ma disponibilité cet après-midi ?')).toContain('google-calendar');
  });

  it('activates linear for ticket / bug messages', () => {
    expect(route('Crée un ticket pour ce bug urgent')).toContain('linear');
    expect(route('Open a linear issue for the backlog')).toContain('linear');
  });

  it('activates github for code-version messages', () => {
    expect(route('Ouvre une pull request sur le repo github')).toContain('github');
    expect(route('clone repo and commit the fix')).toContain('github');
  });

  it('activates brave-search for web-info messages', () => {
    expect(route('rechercher sur le web les actualités du jour')).toContain('brave-search');
    expect(route('what happened with OpenAI today')).toContain('brave-search');
  });

  it('is accent-insensitive (réunion matches reunion)', () => {
    expect(route('reunion demain')).toContain('google-calendar');
    expect(route('RÉUNION DEMAIN')).toContain('google-calendar');
  });

  it('can activate multiple servers for a mixed message', () => {
    const res = route('Envoie un email pour organiser une réunion demain');
    expect(res).toContain('gmail');
    expect(res).toContain('google-calendar');
  });

  it('exposes the list of known servers', () => {
    const names = getAvailableServers();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(5);
    expect(names).toContain('gmail');
    expect(names).toContain('github');
  });

  it('activates puppeteer for explicit browser automation', () => {
    expect(route('prends un screenshot de la page home')).toContain('puppeteer');
    expect(route('screenshot the page then extract content')).toContain('puppeteer');
  });

  it('activates puppeteer or stagehand for prospection / LinkedIn', () => {
    const res1 = route('trouve moi des prospects sur linkedin');
    expect(res1.length).toBeGreaterThan(0);
    expect(res1.some((s) => s === 'puppeteer' || s === 'stagehand')).toBe(true);

    const res2 = route('qualifier des leads depuis sales navigator');
    expect(res2.length).toBeGreaterThan(0);

    const res3 = route('navigue sur le site de stripe et extrais le pricing');
    expect(res3).toContain('puppeteer');
  });

  it('activates stagehand for multi-step agentic tasks', () => {
    expect(route('trouve-moi les 10 premieres entreprises SaaS en France')).toContain('stagehand');
    expect(route('log in then search and click the 3rd result')).toContain('stagehand');
  });
});
