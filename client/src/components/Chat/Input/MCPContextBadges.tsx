import React from 'react';
import { Mail, HardDrive, Calendar, Layout, Github, MessageSquare, FileText, Search } from 'lucide-react';

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
};

export function MCPContextBadges({ activeServers }: MCPContextBadgesProps) {
  if (!activeServers || activeServers.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-1 py-1">
      {activeServers.map((serverName) => (
        <div
          key={serverName}
          className="flex items-center gap-1.5 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs text-text-secondary"
          title={`Using ${SERVER_LABELS[serverName] || serverName}`}
        >
          {SERVER_ICONS[serverName] || <div className="h-3 w-3 rounded-full bg-surface-quaternary" />}
          <span className="font-medium">{SERVER_LABELS[serverName] || serverName}</span>
        </div>
      ))}
    </div>
  );
}

export default MCPContextBadges;
