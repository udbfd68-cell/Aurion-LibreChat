import React from 'react';
import { Mail, HardDrive, Calendar, Layout, Github, MessageSquare, FileText, Search, Globe, MousePointerClick } from 'lucide-react';

interface MCPContextBadgesProps {
  activeServers: string[];
}

const SERVER_ICONS: Record<string, React.ReactNode> = {
  gmail: <Mail className="h-3 w-3" />,
  'google-drive': <HardDrive className="h-3 w-3" />,
  'google-calendar': <Calendar className="h-3 w-3" />,
  linear: <Layout className="h-3 w-3" />,
  github: <Github className="h-3 w-3" />,
  slack: <MessageSquare className="h-3 w-3" />,
  notion: <FileText className="h-3 w-3" />,
  'brave-search': <Search className="h-3 w-3" />,
  filesystem: <HardDrive className="h-3 w-3" />,
  puppeteer: <Globe className="h-3 w-3" />,
  stagehand: <MousePointerClick className="h-3 w-3" />,
  playwright: <MousePointerClick className="h-3 w-3" />,
};

const SERVER_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  'google-drive': 'Drive',
  'google-calendar': 'Calendar',
  linear: 'Linear',
  github: 'GitHub',
  slack: 'Slack',
  notion: 'Notion',
  'brave-search': 'Search',
  filesystem: 'Files',
  puppeteer: 'Browser',
  stagehand: 'Web Agent',
  playwright: 'Web Browser',
};

export function MCPContextBadges({ activeServers }: MCPContextBadgesProps) {
  if (!activeServers || activeServers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 text-xs text-text-tertiary">
      <span className="select-none opacity-60">via</span>
      {activeServers.map((serverName, idx) => (
        <div
          key={serverName}
          className="flex items-center gap-1"
          title={`Using ${SERVER_LABELS[serverName] || serverName}`}
        >
          {SERVER_ICONS[serverName]}
          <span>{SERVER_LABELS[serverName] || serverName}</span>
          {idx < activeServers.length - 1 && (
            <span className="ml-1 opacity-40">·</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default MCPContextBadges;
