import React, { useState, useCallback, useMemo } from 'react';
import { Check } from 'lucide-react';
import type PptxGenJS from 'pptxgenjs';

/* ═══════════════════════════════════════════════════════════════════════
   CONTEXT-AWARE EXPORT ACTIONS
   Detects what the AI generated and shows ONLY relevant service buttons.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Content type detection ── */
type ContentType =
  | 'email'
  | 'code'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'task'
  | 'message'
  | 'social'
  | 'calendar'
  | 'crm'
  | 'design'
  | 'note'
  | 'sql'
  | 'api'
  | 'devops'
  | 'general';

function detectContentTypes(content: string, language?: string): ContentType[] {
  const lower = content.toLowerCase();
  const types: ContentType[] = [];

  // EMAIL — subject/to/from headers, email patterns, salutations
  if (
    /^(objet|subject|sujet|à|to|de|from|destinataire)\s*:/im.test(content) ||
    /\b(cordialement|bien cordialement|sincèrement|salutations|regards|sincerely|best regards|kind regards|dear|cher|chère|veuillez agréer|je vous prie)\b/i.test(content) ||
    /\b(e-?mail|courriel|courrier|lettre|mail)\b/i.test(lower) ||
    /\b(bonjour|hello|hi)\b.*\n.*\n.*\b(cordialement|regards|merci)\b/is.test(content)
  ) {
    types.push('email');
  }

  // CODE — language hint or code patterns
  if (
    language ||
    /^```\w+/m.test(content) ||
    /\b(function|const|let|var|import|export|class|def|async|await|return|if\s*\(|for\s*\(|while\s*\()\b/.test(content) ||
    /[{};]\s*$/m.test(content) ||
    /^\s*(import|from|require|using|package|#include)\b/m.test(content)
  ) {
    types.push('code');
  }

  // SQL — database queries
  if (
    /\b(SELECT|INSERT|UPDATE|DELETE|CREATE TABLE|ALTER TABLE|DROP TABLE|JOIN|WHERE|GROUP BY|ORDER BY|HAVING)\b/i.test(content) &&
    /\b(FROM|INTO|SET|VALUES)\b/i.test(content)
  ) {
    types.push('sql');
  }

  // API — REST/GraphQL endpoints, JSON schemas
  if (
    /\b(GET|POST|PUT|PATCH|DELETE)\s+\//i.test(content) ||
    /\b(endpoint|api|graphql|mutation|query|rest|swagger|openapi)\b/i.test(lower) ||
    /\b(curl|fetch|axios|request)\b/i.test(lower) ||
    /Content-Type:\s*application\/json/i.test(content)
  ) {
    types.push('api');
  }

  // DEVOPS — Docker, CI/CD, infra
  if (
    /\b(docker|kubernetes|k8s|helm|terraform|ansible|jenkins|github actions|gitlab ci|circleci|nginx|apache|dockerfile|docker-compose|yaml|pipeline)\b/i.test(lower)
  ) {
    types.push('devops');
  }

  // SPREADSHEET — tables, CSV, data rows
  if (
    /\|.*\|.*\|/m.test(content) ||
    /\b(tableau|table|csv|excel|spreadsheet|feuille de calcul|colonne|column|row|ligne)\b/i.test(lower) ||
    (content.split('\n').filter(l => l.includes(',')).length > 3 && content.split('\n').length > 4)
  ) {
    types.push('spreadsheet');
  }

  // PRESENTATION — slides
  if (
    /\b(slide|diapositive|présentation|presentation|powerpoint|keynote)\b/i.test(lower) ||
    /^#{1,2}\s+slide\s+\d+/im.test(content) ||
    /\b(slide\s*\d+|diapo\s*\d+)\b/i.test(lower)
  ) {
    types.push('presentation');
  }

  // TASK — todo lists, project management
  if (
    /\b(tâche|task|todo|to-do|sprint|backlog|epic|story|user story|milestone|deadline|échéance|priorité|priority|assigné|assigned|kanban)\b/i.test(lower) ||
    /^[-*]\s*\[[ x]\]/m.test(content) ||
    /\b(étape|step)\s*\d+/i.test(lower)
  ) {
    types.push('task');
  }

  // MESSAGE — chat message, team communication
  if (
    /\b(message|messagerie|chat|discussion|conversation|réponse|response|annonce|announcement|notification)\b/i.test(lower) &&
    content.length < 2000
  ) {
    types.push('message');
  }

  // SOCIAL MEDIA — social posts, tweets, captions
  if (
    /\b(post|publication|tweet|thread|caption|légende|hashtag|#\w+|linkedin|twitter|instagram|facebook|tiktok|réseau social|social media)\b/i.test(lower) ||
    (content.match(/#\w+/g)?.length ?? 0) >= 2
  ) {
    types.push('social');
  }

  // CALENDAR — events, meetings, schedules
  if (
    /\b(réunion|meeting|rendez-vous|rdv|agenda|calendrier|calendar|événement|event|invitation|invite|horaire|schedule|créneau|slot|date|heure|time)\b/i.test(lower) &&
    /\b(\d{1,2}[/.-]\d{1,2}|\d{1,2}h\d{0,2}|\d{1,2}:\d{2})\b/.test(content)
  ) {
    types.push('calendar');
  }

  // CRM — client/prospect/lead management
  if (
    /\b(client|prospect|lead|pipeline|opportunité|opportunity|deal|contact|account|crm|salesforce|hubspot|relation client|suivi commercial|fiche client)\b/i.test(lower)
  ) {
    types.push('crm');
  }

  // DESIGN — UI mockups, CSS, design specs
  if (
    /\b(design|maquette|mockup|wireframe|figma|sketch|ui|ux|composant|component|palette|couleur|color|typograph|font|layout|mise en page)\b/i.test(lower) ||
    (language && ['css', 'scss', 'less', 'svg'].includes(language.toLowerCase()))
  ) {
    types.push('design');
  }

  // NOTE / DOCUMENT — general writing, articles, docs
  if (
    /\b(document|article|rapport|report|résumé|summary|synthèse|analyse|analysis|guide|tutoriel|tutorial|procédure|procedure|note|memo|compte.rendu|brief|cahier des charges)\b/i.test(lower) ||
    content.length > 500
  ) {
    types.push('document');
  }

  // NOTE-TAKING specific
  if (
    /\b(note|notes|prise de notes|memo|mémo|idée|idea|brainstorm|réflexion)\b/i.test(lower)
  ) {
    types.push('note');
  }

  // If nothing matched, it's general content
  if (types.length === 0) {
    types.push('general');
  }

  return [...new Set(types)];
}

/* ── Map content types → relevant service IDs ── */
const CONTENT_TYPE_SERVICES: Record<ContentType, string[]> = {
  email:        ['gmail', 'outlook', 'exportPdf', 'drive', 'download'],
  code:         ['vscode', 'github', 'gitlab', 'exportPdf', 'drive', 'download'],
  sql:          ['vscode', 'github', 'drive', 'download'],
  api:          ['vscode', 'github', 'postman', 'download'],
  devops:       ['vscode', 'github', 'gitlab', 'download'],
  document:     ['exportPdf', 'drive', 'notion', 'dropbox', 'onedrive', 'download'],
  spreadsheet:  ['exportXlsx', 'sheets', 'excel', 'drive', 'download'],
  presentation: ['exportPptx', 'slides', 'drive', 'download'],
  task:         ['trello', 'asana', 'jira', 'notion', 'monday', 'exportPdf', 'download'],
  message:      ['slack', 'teams', 'discord', 'whatsapp', 'telegram', 'download'],
  social:       ['linkedin', 'twitter', 'facebook', 'instagram', 'buffer', 'download'],
  calendar:     ['gcalendar', 'outlook', 'download'],
  crm:          ['hubspot', 'salesforce', 'exportXlsx', 'notion', 'sheets', 'download'],
  design:       ['figma', 'vscode', 'exportPdf', 'drive', 'download'],
  note:         ['exportPdf', 'notion', 'evernote', 'drive', 'download'],
  general:      ['exportPdf', 'drive', 'notion', 'gmail', 'download'],
};

/* ═══════════════════════════════════════════════════════════════════════
   ALL SERVICE ICONS (inline SVG — no external deps)
   ═══════════════════════════════════════════════════════════════════════ */

const I = ({ size = 16, children, vb = '0 0 24 24' }: { size?: number; children: React.ReactNode; vb?: string }) => (
  <svg width={size} height={size} viewBox={vb} fill="none" xmlns="http://www.w3.org/2000/svg">{children}</svg>
);

const icons: Record<string, (s: number) => React.ReactNode> = {
  vscode: (s) => <I size={s}><path d="M17.5 2L10 8.5L4.5 4L2 5.5L6.5 12L2 18.5L4.5 20L10 15.5L17.5 22L22 20V4L17.5 2ZM17.5 17.5L12 12L17.5 6.5V17.5Z" fill="currentColor"/></I>,
  gmail: (s) => <I size={s}><path d="M2 6L12 13L22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6Z" fill="#EA4335" opacity="0.3"/><path d="M22 6L12 13L2 6C2 4.9 2.9 4 4 4H20C21.1 4 22 4.9 22 6Z" fill="#EA4335"/></I>,
  outlook: (s) => <I size={s}><path d="M12 2L2 6v12l10 4 10-4V6L12 2z" fill="#0078D4"/><path d="M12 8a4 4 0 100 8 4 4 0 000-8z" fill="white"/></I>,
  drive: (s) => <I size={s}><path d="M8 2L2 14H8L14 2H8Z" fill="#4285F4"/><path d="M14 2L8 14H16L22 2H14Z" fill="#FBBC04"/><path d="M2 14L5 22H19L22 14H2Z" fill="#34A853"/></I>,
  github: (s) => <I size={s}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="currentColor"/></I>,
  gitlab: (s) => <I size={s}><path d="M12 21.35l3.44-10.6h-6.88L12 21.35z" fill="#E24329"/><path d="M12 21.35l-3.44-10.6H1.52L12 21.35z" fill="#FC6D26"/><path d="M1.52 10.75L.17 14.9c-.12.38.01.8.34 1.04L12 21.35 1.52 10.75z" fill="#FCA326"/><path d="M1.52 10.75h7.04L5.67 1.94c-.14-.42-.73-.42-.87 0L1.52 10.75z" fill="#E24329"/><path d="M12 21.35l3.44-10.6h7.04L12 21.35z" fill="#FC6D26"/><path d="M22.48 10.75l1.35 4.15c.12.38-.01.8-.34 1.04L12 21.35l10.48-10.6z" fill="#FCA326"/><path d="M22.48 10.75h-7.04l2.89-8.81c.14-.42.73-.42.87 0l3.28 8.81z" fill="#E24329"/></I>,
  notion: (s) => <I size={s}><path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.29 2.294c-.42-.326-.98-.7-2.054-.607L3.48 2.61c-.466.046-.56.28-.373.466l1.352 1.132zm.793 2.006v13.89c0 .746.373 1.026 1.213.98l14.523-.84c.84-.046.933-.56.933-1.166V5.35c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.746.327-.746.886zm14.336.42c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.166.514-1.633.514-.746 0-.933-.234-1.493-.934l-4.573-7.186v6.953l1.446.327s0 .84-1.166.84l-3.22.186c-.093-.186 0-.653.327-.746l.84-.233V9.854l-1.166-.093c-.093-.42.14-1.026.793-1.073l3.453-.233 4.76 7.279V9.294l-1.213-.14c-.093-.513.28-.886.746-.933l3.226-.186z" fill="currentColor"/></I>,
  slack: (s) => <I size={s} vb="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#E01E5A"/><path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36C5F0"/><path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.27 0a2.527 2.527 0 0 1-2.522 2.521 2.527 2.527 0 0 1-2.522-2.521V2.522A2.527 2.527 0 0 1 15.164 0a2.528 2.528 0 0 1 2.522 2.522v6.312z" fill="#2EB67D"/><path d="M15.164 18.956a2.528 2.528 0 0 1 2.522 2.522A2.528 2.528 0 0 1 15.164 24a2.527 2.527 0 0 1-2.522-2.522v-2.522h2.522zm0-1.27a2.527 2.527 0 0 1-2.522-2.522 2.527 2.527 0 0 1 2.522-2.522h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.522h-6.314z" fill="#ECB22E"/></I>,
  teams: (s) => <I size={s}><path d="M20 6h-4V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z" fill="#6264A7"/><circle cx="15" cy="10" r="2" fill="white"/><circle cx="9" cy="10" r="2" fill="white"/><path d="M7 14c0-1.1 1.8-2 4-2s4 .9 4 2v1H7v-1z" fill="white" opacity="0.8"/></I>,
  discord: (s) => <I size={s}><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2"/></I>,
  whatsapp: (s) => <I size={s}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366"/></I>,
  telegram: (s) => <I size={s}><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#0088CC"/><path d="M17.2 7.2l-2.1 10.2c-.15.7-.55.87-1.1.54l-3.1-2.3-1.5 1.4c-.17.17-.3.3-.62.3l.22-3.2 5.8-5.2c.25-.22-.05-.35-.4-.13l-7.1 4.5-3.1-.96c-.67-.2-.68-.67.14-.99l12-4.6c.56-.2 1.04.14.86.99z" fill="white"/></I>,
  trello: (s) => <I size={s}><rect width="24" height="24" rx="4" fill="#0079BF"/><rect x="4" y="4" width="7" height="14" rx="1.5" fill="white"/><rect x="13" y="4" width="7" height="9" rx="1.5" fill="white"/></I>,
  asana: (s) => <I size={s}><circle cx="12" cy="6" r="4" fill="#F06A6A"/><circle cx="5" cy="16" r="4" fill="#F06A6A"/><circle cx="19" cy="16" r="4" fill="#F06A6A"/></I>,
  jira: (s) => <I size={s}><path d="M23.323 11.33L13.001 1 12 0 4.225 7.775.676 11.33a.96.96 0 000 1.347l7.1 7.1L12 24l7.775-7.775.207-.207 3.341-3.341a.96.96 0 000-1.347zM12 15.544L8.456 12 12 8.456 15.544 12 12 15.544z" fill="#2684FF"/></I>,
  monday: (s) => <I size={s}><circle cx="5" cy="8" r="3" fill="#FF3D57"/><circle cx="12" cy="8" r="3" fill="#FFCB00"/><circle cx="19" cy="8" r="3" fill="#00CA72"/><circle cx="5" cy="16" r="3" fill="#FF3D57"/><circle cx="12" cy="16" r="3" fill="#FFCB00"/><circle cx="19" cy="16" r="3" fill="#00CA72"/></I>,
  linkedin: (s) => <I size={s}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" fill="#0A66C2"/></I>,
  twitter: (s) => <I size={s}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/></I>,
  facebook: (s) => <I size={s}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/></I>,
  instagram: (s) => <I size={s}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" fill="#E4405F"/></I>,
  buffer: (s) => <I size={s}><path d="M12 2L2 7l10 5 10-5-10-5zM2 12l10 5 10-5M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/></I>,
  gcalendar: (s) => <I size={s}><rect x="3" y="4" width="18" height="18" rx="2" fill="#4285F4"/><rect x="3" y="4" width="18" height="5" fill="#1967D2"/><circle cx="8" cy="14" r="1.5" fill="white"/><circle cx="12" cy="14" r="1.5" fill="white"/><circle cx="16" cy="14" r="1.5" fill="white"/><circle cx="8" cy="18" r="1.5" fill="white"/><circle cx="12" cy="18" r="1.5" fill="white"/></I>,
  hubspot: (s) => <I size={s}><path d="M17.1 8.6V5.8a2.3 2.3 0 001.4-2.1 2.3 2.3 0 10-3.7 1.8v3.2a6.1 6.1 0 00-4.2 2.3L4.4 6.5a2.6 2.6 0 00.3-1.2A2.3 2.3 0 102.4 7.6a2.3 2.3 0 001.1-.3l6.1 4.4a6.1 6.1 0 00-.3 1.9 6.2 6.2 0 00.5 2.4l-2.5 2.1a2 2 0 00-1.3-.5 2 2 0 102 2 2 2 0 00-.3-1l2.4-2a6.2 6.2 0 103.7-10.7 6.1 6.1 0 00-3.8 1.3z" fill="#FF7A59"/></I>,
  salesforce: (s) => <I size={s}><path d="M10 4.5a4.5 4.5 0 013.8 2.1A3.8 3.8 0 0118 5a4 4 0 014 4c0 .4-.1.8-.2 1.2A3.5 3.5 0 0122 17.5h0a3.5 3.5 0 01-3.5 0l-.3-.1a4 4 0 01-3.7 2.6 3.9 3.9 0 01-2.6-1 4.5 4.5 0 01-7.4-1A3 3 0 012 15a3 3 0 012.5-3A4.5 4.5 0 0110 4.5z" fill="#00A1E0"/></I>,
  sheets: (s) => <I size={s}><rect x="4" y="2" width="16" height="20" rx="2" fill="#0F9D58"/><rect x="7" y="7" width="10" height="2" fill="white"/><rect x="7" y="11" width="10" height="2" fill="white"/><rect x="7" y="15" width="10" height="2" fill="white"/><line x1="12" y1="7" x2="12" y2="17" stroke="#0F9D58" strokeWidth="1"/></I>,
  excel: (s) => <I size={s}><rect x="4" y="2" width="16" height="20" rx="2" fill="#217346"/><path d="M8 8l3 4-3 4h2.5l1.75-2.5L14 16h2.5l-3-4 3-4H14l-1.75 2.5L10.5 8H8z" fill="white"/></I>,
  slides: (s) => <I size={s}><rect x="3" y="4" width="18" height="16" rx="2" fill="#F4B400"/><rect x="6" y="7" width="12" height="10" fill="white"/></I>,
  dropbox: (s) => <I size={s}><path d="M12 2l-5 3.2 5 3.2-5 3.2L2 8.4l5-3.2L2 2l5-3.2L12 2zm0 0l5 3.2-5 3.2 5 3.2 5-3.2-5-3.2 5-3.2L17 2l-5 3.2zm-5 13.4l5 3.2 5-3.2-5-3.2-5 3.2z" fill="#0061FF" transform="translate(0,2)"/></I>,
  onedrive: (s) => <I size={s}><path d="M14 8a5 5 0 00-9.3 1.7A4 4 0 005 18h13a3.5 3.5 0 00.5-7A5 5 0 0014 8z" fill="#0078D4"/></I>,
  figma: (s) => <I size={s}><path d="M8 24c2.2 0 4-1.8 4-4v-4H8c-2.2 0-4 1.8-4 4s1.8 4 4 4z" fill="#0ACF83"/><path d="M4 12c0-2.2 1.8-4 4-4h4v8H8c-2.2 0-4-1.8-4-4z" fill="#A259FF"/><path d="M4 4c0-2.2 1.8-4 4-4h4v8H8C5.8 8 4 6.2 4 4z" fill="#F24E1E"/><path d="M12 0h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-4V0z" fill="#FF7262"/><path d="M20 12c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z" fill="#1ABCFE"/></I>,
  evernote: (s) => <I size={s}><path d="M8 2C5.8 2 4 3.8 4 6v12c0 2.2 1.8 4 4 4h8c2.2 0 4-1.8 4-4V8l-6-6H8z" fill="#00A82D"/><path d="M14 2l6 6h-4c-1.1 0-2-.9-2-2V2z" fill="white" opacity="0.5"/><rect x="7" y="10" width="6" height="1.5" rx="0.75" fill="white"/><rect x="7" y="13" width="8" height="1.5" rx="0.75" fill="white"/><rect x="7" y="16" width="5" height="1.5" rx="0.75" fill="white"/></I>,
  postman: (s) => <I size={s}><circle cx="12" cy="12" r="10" fill="#FF6C37"/><path d="M8 10l4-3 4 3v4l-4 3-4-3v-4z" fill="white"/></I>,
  exportPptx: (s) => <I size={s}><rect x="3" y="2" width="18" height="20" rx="2" fill="#D24726"/><path d="M8 8h3c1.66 0 3 .9 3 2.5S12.66 13 11 13H9.5v3H8V8zm1.5 3.5H11c.83 0 1.5-.45 1.5-1s-.67-1-1.5-1H9.5v2z" fill="white"/></I>,
  exportPdf: (s) => <I size={s}><rect x="3" y="2" width="18" height="20" rx="2" fill="#E53935"/><path d="M7 8h2.5c1.38 0 2.5.67 2.5 2s-1.12 2-2.5 2H8.5v3H7V8zm1.5 2.7H9.5c.69 0 1-.35 1-.7s-.31-.7-1-.7H8.5v1.4zM13 8h2c2.21 0 3.5 1.5 3.5 3.5S17.21 15 15 15h-2V8zm1.5 5.5h.5c1.38 0 2-.97 2-2s-.62-2-2-2h-.5v4z" fill="white"/></I>,
  exportXlsx: (s) => <I size={s}><rect x="3" y="2" width="18" height="20" rx="2" fill="#217346"/><path d="M7 8l2.5 3.5L7 15h1.8l1.6-2.3L12 15h1.8l-2.5-3.5L13.8 8H12l-1.6 2.3L8.8 8H7zm7 0v7h1.2v-2.8h1.3c1.1 0 2-.6 2-1.6s-.9-1.6-2-1.6H14zm1.2 1h1.3c.5 0 .8.25.8.6s-.3.6-.8.6h-1.3V9z" fill="white"/></I>,
  download: (s) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════════════
   ALL SERVICE HANDLERS — open the right app with pre-filled content
   ═══════════════════════════════════════════════════════════════════════ */

function downloadBlob(content: string, fileName: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function copyAndOpen(content: string, url: string) {
  navigator.clipboard.writeText(content).then(() => {
    window.open(url, '_blank', 'noopener');
  });
}

function extractEmailFields(content: string) {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  let subject = '';
  let to = '';
  for (const line of lines) {
    const sm = line.match(/^(?:objet|subject|sujet|re)\s*:\s*(.+)/i);
    if (sm && !subject) subject = sm[1].trim();
    const tm = line.match(/^(?:à|to|destinataire|pour)\s*:\s*(.+)/i);
    if (tm && !to) to = tm[1].trim();
  }
  const cleanBody = lines
    .filter(l => !l.match(/^(?:objet|subject|sujet|à|to|de|from|destinataire|pour|date|cc|bcc|cci)\s*:/i))
    .join('\n');
  return { subject, to, body: cleanBody };
}

type HandlerFn = (content: string, fileName: string) => void | Promise<void>;

const handlers: Record<string, HandlerFn> = {
  vscode: (content, fileName) => {
    downloadBlob(content, fileName);
    setTimeout(() => {
      try {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'vscode://file/?windowId=_blank';
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 1000);
      } catch { /* OK */ }
    }, 200);
  },
  gmail: (content, fileName) => {
    const { subject, to, body } = extractEmailFields(content);
    const su = encodeURIComponent(subject || `📄 ${fileName}`);
    const b = encodeURIComponent(body.slice(0, 5000));
    const t = to ? `&to=${encodeURIComponent(to)}` : '';
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${su}&body=${b}${t}`, '_blank', 'noopener');
  },
  outlook: (content, fileName) => {
    const { subject, to, body } = extractEmailFields(content);
    const su = encodeURIComponent(subject || `📄 ${fileName}`);
    const b = encodeURIComponent(body.slice(0, 5000));
    const t = to ? `&to=${encodeURIComponent(to)}` : '';
    window.open(`https://outlook.live.com/mail/0/deeplink/compose?subject=${su}&body=${b}${t}`, '_blank', 'noopener');
  },
  drive: (content, fileName) => {
    downloadBlob(content, fileName);
    window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener');
  },
  dropbox: (content, fileName) => {
    downloadBlob(content, fileName);
    window.open('https://www.dropbox.com/home', '_blank', 'noopener');
  },
  onedrive: (content, fileName) => {
    downloadBlob(content, fileName);
    window.open('https://onedrive.live.com', '_blank', 'noopener');
  },
  github: (content) => copyAndOpen(content, 'https://gist.github.com'),
  gitlab: (content) => copyAndOpen(content, 'https://gitlab.com/snippets/new'),
  notion: (content) => copyAndOpen(content, 'https://www.notion.so'),
  evernote: (content) => copyAndOpen(content, 'https://www.evernote.com/client/web'),
  slack: (content) => copyAndOpen(content, 'https://app.slack.com'),
  teams: (content) => copyAndOpen(content, 'https://teams.microsoft.com'),
  discord: (content) => copyAndOpen(content, 'https://discord.com/channels/@me'),
  whatsapp: (content) => {
    const text = encodeURIComponent(content.slice(0, 3000));
    window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank', 'noopener');
  },
  telegram: (content) => {
    const text = encodeURIComponent(content.slice(0, 3000));
    window.open(`https://t.me/share/url?text=${text}`, '_blank', 'noopener');
  },
  linkedin: (content) => {
    const text = encodeURIComponent(content.slice(0, 2800));
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, '_blank', 'noopener');
  },
  twitter: (content) => {
    const text = encodeURIComponent(content.slice(0, 280));
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener');
  },
  facebook: (content) => copyAndOpen(content, 'https://www.facebook.com'),
  instagram: (content) => copyAndOpen(content, 'https://www.instagram.com'),
  buffer: (content) => copyAndOpen(content, 'https://publish.buffer.com/compose'),
  trello: (content) => copyAndOpen(content, 'https://trello.com'),
  asana: (content) => copyAndOpen(content, 'https://app.asana.com'),
  jira: (content) => copyAndOpen(content, 'https://id.atlassian.com'),
  monday: (content) => copyAndOpen(content, 'https://monday.com'),
  gcalendar: (content, fileName) => {
    const title = encodeURIComponent(fileName.replace(/\.\w+$/, ''));
    const details = encodeURIComponent(content.slice(0, 2000));
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${title}&details=${details}`, '_blank', 'noopener');
  },
  hubspot: (content) => copyAndOpen(content, 'https://app.hubspot.com'),
  salesforce: (content) => copyAndOpen(content, 'https://login.salesforce.com'),
  sheets: (content) => copyAndOpen(content, 'https://sheets.google.com/create'),
  excel: (content, fileName) => {
    downloadBlob(content, fileName.replace(/\.\w+$/, '.csv'));
    window.open('https://www.office.com/launch/excel', '_blank', 'noopener');
  },
  slides: (content) => copyAndOpen(content, 'https://slides.google.com/create'),
  figma: (content) => copyAndOpen(content, 'https://www.figma.com'),
  postman: (content) => copyAndOpen(content, 'https://web.postman.co'),

  /* ═══ REAL FILE GENERATION ═══ */

  exportPptx: async (content: string, fileName: string) => {
    try {
      const PptxGenJSModule = await import('pptxgenjs');
      const PptxGenJSClass = PptxGenJSModule.default;
      const pptx = new PptxGenJSClass() as PptxGenJS;
      pptx.author = 'Aurion Chat';
      pptx.title = fileName.replace(/\.[^.]+$/, '');

      // Parse content into slides (split by ## headings or --- separators)
      const sections = content.split(/(?:^---$|^#{1,2}\s+)/m).filter(s => s.trim());
      const rawLines = content.split('\n');
      const headings: string[] = [];
      for (const line of rawLines) {
        const m = line.match(/^#{1,2}\s+(.+)/);
        if (m) headings.push(m[1].trim());
      }

      if (sections.length <= 1) {
        // Single slide with all content
        const slide = pptx.addSlide();
        slide.addText(fileName.replace(/\.[^.]+$/, ''), { x: 0.5, y: 0.3, w: 9, h: 1, fontSize: 28, bold: true, color: '2D3748' });
        slide.addText(content.slice(0, 3000), { x: 0.5, y: 1.5, w: 9, h: 5, fontSize: 14, color: '4A5568', breakType: 'none' as any });
      } else {
        sections.forEach((section, i) => {
          const slide = pptx.addSlide();
          const heading = headings[i] || `Slide ${i + 1}`;
          slide.addText(heading, { x: 0.5, y: 0.3, w: 9, h: 1, fontSize: 24, bold: true, color: '2D3748' });

          // Parse bullet points
          const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
          const bullets = lines.filter(l => l.startsWith('-') || l.startsWith('*') || l.startsWith('•'));

          if (bullets.length > 0) {
            const textItems = bullets.map(b => ({
              text: b.replace(/^[-*•]\s*/, ''),
              options: { fontSize: 16, color: '4A5568', bullet: { type: 'bullet' as const }, breakType: 'none' as any },
            }));
            slide.addText(textItems as any, { x: 0.5, y: 1.5, w: 9, h: 5 });
          } else {
            slide.addText(section.trim().slice(0, 2000), { x: 0.5, y: 1.5, w: 9, h: 5, fontSize: 14, color: '4A5568', breakType: 'none' as any });
          }
        });
      }

      const pptxFileName = fileName.replace(/\.[^.]+$/, '.pptx');
      await pptx.writeFile({ fileName: pptxFileName });
    } catch (err) {
      console.error('PPTX generation failed:', err);
      downloadBlob(content, fileName);
    }
  },

  exportPdf: async (content: string, fileName: string) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      let y = 20;

      const lines = content.split('\n');
      for (const line of lines) {
        // Headings
        const h1 = line.match(/^#\s+(.+)/);
        const h2 = line.match(/^##\s+(.+)/);
        const h3 = line.match(/^###\s+(.+)/);

        if (h1) {
          pdf.setFontSize(22);
          pdf.setFont('helvetica', 'bold');
          pdf.text(h1[1], margin, y);
          y += 10;
        } else if (h2) {
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text(h2[1], margin, y);
          y += 8;
        } else if (h3) {
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text(h3[1], margin, y);
          y += 7;
        } else if (line.trim() === '') {
          y += 4;
        } else {
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          // Clean markdown formatting
          const clean = line.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1');
          const wrapped = pdf.splitTextToSize(clean, maxWidth);
          for (const wl of wrapped) {
            if (y > 280) {
              pdf.addPage();
              y = 20;
            }
            pdf.text(wl, margin, y);
            y += 5.5;
          }
        }

        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
      }

      const pdfFileName = fileName.replace(/\.[^.]+$/, '.pdf');
      pdf.save(pdfFileName);
    } catch (err) {
      console.error('PDF generation failed:', err);
      downloadBlob(content, fileName);
    }
  },

  exportXlsx: async (content: string, fileName: string) => {
    try {
      const XLSX = await import('xlsx');
      const rows: string[][] = [];

      // Try to parse markdown table
      const lines = content.split('\n');
      let foundTable = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // Skip separator rows (|---|---|)
          if (/^\|[\s-:|]+\|$/.test(trimmed)) continue;
          const cells = trimmed.split('|').filter(c => c.trim() !== '').map(c => c.trim());
          rows.push(cells);
          foundTable = true;
        }
      }

      // If no table found, try CSV-like content
      if (!foundTable) {
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.includes(',')) {
            rows.push(trimmed.split(',').map(c => c.trim()));
          } else if (trimmed.includes('\t')) {
            rows.push(trimmed.split('\t').map(c => c.trim()));
          } else {
            rows.push([trimmed]);
          }
        }
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      // Auto-size columns
      const colWidths = rows[0]?.map((_, ci) => {
        const maxLen = Math.max(...rows.map(r => (r[ci] || '').length));
        return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
      });
      if (colWidths) ws['!cols'] = colWidths;

      const xlsxFileName = fileName.replace(/\.[^.]+$/, '.xlsx');
      XLSX.writeFile(wb, xlsxFileName);
    } catch (err) {
      console.error('XLSX generation failed:', err);
      downloadBlob(content, fileName.replace(/\.[^.]+$/, '.csv'));
    }
  },

  download: downloadBlob,
};

/* ── Service labels (French) ── */
const labels: Record<string, string> = {
  vscode: 'Ouvrir dans VS Code',
  gmail: 'Envoyer par Gmail',
  outlook: 'Envoyer par Outlook',
  drive: 'Sauvegarder sur Drive',
  dropbox: 'Sauvegarder sur Dropbox',
  onedrive: 'Sauvegarder sur OneDrive',
  github: 'Créer un Gist GitHub',
  gitlab: 'Créer un Snippet GitLab',
  notion: 'Copier vers Notion',
  evernote: 'Sauvegarder dans Evernote',
  slack: 'Envoyer sur Slack',
  teams: 'Envoyer sur Teams',
  discord: 'Envoyer sur Discord',
  whatsapp: 'Envoyer sur WhatsApp',
  telegram: 'Envoyer sur Telegram',
  linkedin: 'Publier sur LinkedIn',
  twitter: 'Publier sur X / Twitter',
  facebook: 'Publier sur Facebook',
  instagram: 'Copier pour Instagram',
  buffer: 'Programmer via Buffer',
  trello: 'Ajouter dans Trello',
  asana: 'Ajouter dans Asana',
  jira: 'Ajouter dans Jira',
  monday: 'Ajouter dans Monday',
  gcalendar: 'Ajouter au Google Calendar',
  hubspot: 'Ajouter dans HubSpot',
  salesforce: 'Ajouter dans Salesforce',
  sheets: 'Ouvrir dans Google Sheets',
  excel: 'Ouvrir dans Excel',
  slides: 'Ouvrir dans Google Slides',
  figma: 'Copier vers Figma',
  postman: 'Ouvrir dans Postman',
  exportPptx: '📥 Télécharger en PowerPoint (.pptx)',
  exportPdf: '📥 Télécharger en PDF',
  exportXlsx: '📥 Télécharger en Excel (.xlsx)',
  download: 'Télécharger',
};

const colors: Record<string, [string, string]> = {
  vscode: ['text-[#007ACC]', 'hover:bg-[#007ACC]/10'],
  gmail: ['', 'hover:bg-red-500/10'],
  outlook: ['text-[#0078D4]', 'hover:bg-[#0078D4]/10'],
  drive: ['', 'hover:bg-green-500/10'],
  dropbox: ['text-[#0061FF]', 'hover:bg-[#0061FF]/10'],
  onedrive: ['text-[#0078D4]', 'hover:bg-[#0078D4]/10'],
  github: ['text-text-primary', 'hover:bg-surface-hover'],
  gitlab: ['', 'hover:bg-orange-500/10'],
  notion: ['text-text-primary', 'hover:bg-surface-hover'],
  evernote: ['text-[#00A82D]', 'hover:bg-[#00A82D]/10'],
  slack: ['', 'hover:bg-purple-500/10'],
  teams: ['text-[#6264A7]', 'hover:bg-[#6264A7]/10'],
  discord: ['text-[#5865F2]', 'hover:bg-[#5865F2]/10'],
  whatsapp: ['text-[#25D366]', 'hover:bg-[#25D366]/10'],
  telegram: ['text-[#0088CC]', 'hover:bg-[#0088CC]/10'],
  linkedin: ['text-[#0A66C2]', 'hover:bg-[#0A66C2]/10'],
  twitter: ['text-text-primary', 'hover:bg-surface-hover'],
  facebook: ['text-[#1877F2]', 'hover:bg-[#1877F2]/10'],
  instagram: ['text-[#E4405F]', 'hover:bg-[#E4405F]/10'],
  buffer: ['text-text-primary', 'hover:bg-surface-hover'],
  trello: ['text-[#0079BF]', 'hover:bg-[#0079BF]/10'],
  asana: ['text-[#F06A6A]', 'hover:bg-[#F06A6A]/10'],
  jira: ['text-[#2684FF]', 'hover:bg-[#2684FF]/10'],
  monday: ['', 'hover:bg-green-500/10'],
  gcalendar: ['text-[#4285F4]', 'hover:bg-[#4285F4]/10'],
  hubspot: ['text-[#FF7A59]', 'hover:bg-[#FF7A59]/10'],
  salesforce: ['text-[#00A1E0]', 'hover:bg-[#00A1E0]/10'],
  sheets: ['text-[#0F9D58]', 'hover:bg-[#0F9D58]/10'],
  excel: ['text-[#217346]', 'hover:bg-[#217346]/10'],
  slides: ['text-[#F4B400]', 'hover:bg-[#F4B400]/10'],
  figma: ['', 'hover:bg-purple-500/10'],
  postman: ['text-[#FF6C37]', 'hover:bg-[#FF6C37]/10'],
  exportPptx: ['text-[#D24726]', 'hover:bg-[#D24726]/10'],
  exportPdf: ['text-[#E53935]', 'hover:bg-[#E53935]/10'],
  exportXlsx: ['text-[#217346]', 'hover:bg-[#217346]/10'],
  download: ['text-text-secondary', 'hover:bg-surface-hover'],
};

/* ── Extension mapping for file names ── */
const EXT_MAP: Record<string, string> = {
  javascript: 'js', typescript: 'ts', python: 'py', java: 'java',
  csharp: 'cs', cpp: 'cpp', c: 'c', go: 'go', rust: 'rs',
  ruby: 'rb', php: 'php', swift: 'swift', kotlin: 'kt',
  html: 'html', css: 'css', scss: 'scss', less: 'less',
  json: 'json', yaml: 'yaml', yml: 'yml', toml: 'toml',
  markdown: 'md', md: 'md', sql: 'sql', shell: 'sh', bash: 'sh',
  powershell: 'ps1', dockerfile: 'Dockerfile', xml: 'xml',
  jsx: 'jsx', tsx: 'tsx', vue: 'vue', svelte: 'svelte',
};

function getFileName(title?: string, lang?: string, type?: string): string {
  let ext = 'txt';
  if (lang && EXT_MAP[lang.toLowerCase()]) ext = EXT_MAP[lang.toLowerCase()];
  else if (type === 'application/vnd.ant.code') ext = 'tsx';
  else if (type === 'text/markdown') ext = 'md';
  else if (type === 'text/html') ext = 'html';

  if (title) {
    const clean = title.replace(/[^a-zA-Z0-9_\-. ]/g, '').replace(/\s+/g, '-');
    if (clean.includes('.')) return clean;
    return `${clean}.${ext}`;
  }
  return `artifact.${ext}`;
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

interface ExportActionsProps {
  content: string;
  title?: string;
  language?: string;
  type?: string;
  compact?: boolean;
  /** If provided, override auto-detection with explicit service list */
  actions?: string[];
  /** 'auto' = detect content types and show relevant services (default) */
  mode?: 'auto' | 'manual';
}

const ExportActions: React.FC<ExportActionsProps> = ({
  content,
  title,
  language,
  type,
  compact = false,
  actions,
  mode = actions ? 'manual' : 'auto',
}) => {
  const [doneAction, setDoneAction] = useState<string | null>(null);

  const fileName = useMemo(() => getFileName(title, language, type), [title, language, type]);

  const markDone = useCallback((id: string) => {
    setDoneAction(id);
    setTimeout(() => setDoneAction(null), 2000);
  }, []);

  const visibleServiceIds = useMemo(() => {
    if (mode === 'manual' && actions) {
      return actions.filter(id => handlers[id] && icons[id]);
    }

    // AUTO MODE: detect content and pick relevant services
    const types = detectContentTypes(content, language);
    const serviceSet = new Set<string>();
    for (const t of types) {
      const services = CONTENT_TYPE_SERVICES[t] || [];
      for (const s of services) {
        if (handlers[s] && icons[s]) serviceSet.add(s);
      }
    }
    serviceSet.add('download');

    const arr = [...serviceSet];
    return compact ? arr.slice(0, 5) : arr.slice(0, 8);
  }, [mode, actions, content, language, compact]);

  if (!content || visibleServiceIds.length === 0) return null;

  const iconSize = compact ? 14 : 16;

  if (compact) {
    return (
      <div className="flex items-center gap-0.5">
        {visibleServiceIds.map((id) => {
          const isDone = doneAction === id;
          const [col, hov] = colors[id] || ['', 'hover:bg-surface-hover'];
          return (
            <button
              key={id}
              onClick={(e) => { e.stopPropagation(); handlers[id](content, fileName); markDone(id); }}
              title={labels[id] || id}
              className={`rounded p-1 transition-colors ${col} ${hov} ${isDone ? 'text-green-500' : ''}`}
            >
              {isDone ? <Check size={14} /> : icons[id](iconSize)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {visibleServiceIds.map((id) => {
        const isDone = doneAction === id;
        const [col, hov] = colors[id] || ['', 'hover:bg-surface-hover'];
        return (
          <button
            key={id}
            onClick={(e) => { e.stopPropagation(); handlers[id](content, fileName); markDone(id); }}
            title={labels[id] || id}
            className={`
              inline-flex items-center gap-1.5 rounded-lg border border-border-light
              px-2.5 py-1.5 text-xs font-medium transition-all duration-200
              ${isDone
                ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
                : `bg-surface-tertiary ${hov} ${col || 'text-text-secondary'} hover:text-text-primary hover:border-border-medium hover:shadow-sm active:scale-[0.97]`
              }
            `}
          >
            {isDone ? <Check size={14} /> : icons[id](iconSize)}
            <span>{isDone ? 'Fait !' : (labels[id] || id)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ExportActions;
