import type { InfiniteData } from '@tanstack/react-query';
import type * as p from '../accessPermissions';
import type * as a from '../types/agents';
import type * as s from '../schemas';
import type * as t from '../types';

export type Conversation = {
  id: string;
  createdAt: number;
  participants: string[];
  lastMessage: string;
  conversations: s.TConversation[];
};

export type ConversationListParams = {
  cursor?: string;
  isArchived?: boolean;
  sortBy?: 'title' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  tags?: string[];
  search?: string;
};

export type MinimalConversation = Pick<
  s.TConversation,
  'conversationId' | 'endpoint' | 'title' | 'createdAt' | 'updatedAt' | 'user'
>;

export type ConversationListResponse = {
  conversations: MinimalConversation[];
  nextCursor: string | null;
};

export type ConversationData = InfiniteData<ConversationListResponse>;
export type ConversationUpdater = (
  data: ConversationData,
  conversation: s.TConversation,
) => ConversationData;

/* Messages */
export type MessagesListParams = {
  cursor?: string | null;
  sortBy?: 'endpoint' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  pageSize?: number;
  conversationId?: string;
  messageId?: string;
  search?: string;
};

export type MessagesListResponse = {
  messages: s.TMessage[];
  nextCursor: string | null;
};

/* Shared Links */
export type SharedMessagesResponse = Omit<s.TSharedLink, 'messages'> & {
  messages: s.TMessage[];
};

export interface SharedLinksListParams {
  pageSize: number;
  isPublic: boolean;
  sortBy: 'title' | 'createdAt';
  sortDirection: 'asc' | 'desc';
  search?: string;
  cursor?: string;
}

export type SharedLinkItem = {
  shareId: string;
  title: string;
  isPublic: boolean;
  createdAt: Date;
  conversationId: string;
};

export interface SharedLinksResponse {
  links: SharedLinkItem[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface SharedLinkQueryData {
  pages: SharedLinksResponse[];
  pageParams: (string | null)[];
}

export type AllPromptGroupsFilterRequest = {
  category: string;
  pageNumber: string;
  pageSize: string | number;
  before?: string | null;
  after?: string | null;
  order?: 'asc' | 'desc';
  name?: string;
  author?: string;
};

export type AllPromptGroupsResponse = t.TPromptGroup[];

export type ConversationTagsResponse = s.TConversationTag[];

/* MCP Types */
export type MCPTool = {
  name: string;
  pluginKey: string;
  description: string;
};

export type MCPServer = {
  name: string;
  icon: string;
  authenticated: boolean;
  authConfig: s.TPluginAuthConfig[];
  tools: MCPTool[];
};

export type MCPServersResponse = {
  servers: Record<string, MCPServer>;
};

export type VerifyToolAuthParams = { toolId: string };
export type VerifyToolAuthResponse = {
  authenticated: boolean;
  message?: string | s.AuthType;
  authTypes?: [string, s.AuthType][];
};

export type GetToolCallParams = { conversationId: string };
export type ToolCallResults = a.ToolCallResult[];

/* Memories */
export type TUserMemory = {
  key: string;
  value: string;
  updated_at: string;
  tokenCount?: number;
};

export type MemoriesResponse = {
  memories: TUserMemory[];
  totalTokens: number;
  tokenLimit: number | null;
  usagePercentage: number | null;
};

export type TProject = {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds: string[];
  color?: string;
  icon?: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectPayload = {
  name: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds?: string[];
  color?: string;
  icon?: string;
};

export type UpdateProjectPayload = {
  name?: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds?: string[];
  color?: string;
  icon?: string;
  archivedAt?: string | null;
};

/* Skills */
export type TSkill = {
  _id: string;
  userId?: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  color?: string;
  category: string;
  isBuiltIn: boolean;
  isPublic: boolean;
  tools?: string[];
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateSkillPayload = {
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  color?: string;
  category?: string;
  tools?: string[];
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
};

export type UpdateSkillPayload = {
  name?: string;
  description?: string;
  systemPrompt?: string;
  icon?: string;
  color?: string;
  category?: string;
  tools?: string[];
  modelConfig?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
};

/* Artifacts (Persistence) */
export type TArtifact = {
  _id: string;
  userId: string;
  conversationId: string;
  messageId: string;
  identifier: string;
  title: string;
  type: string;
  language?: string;
  content: string;
  version: number;
  parentId?: string;
  shareId?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SaveArtifactPayload = {
  conversationId: string;
  messageId: string;
  identifier: string;
  title: string;
  type: string;
  language?: string;
  content: string;
};

export type ShareArtifactPayload = {
  isPublic: boolean;
};

/* Deep Research */
export type DeepResearchPayload = {
  query: string;
  conversationId?: string;
};

export type DeepResearchResponse = {
  query: string;
  report: string;
  subQuestions: string[];
  totalSteps: number;
};

/* MCP Registry */
export type TMCPRegistryCategory = {
  id: string;
  name: string;
  icon: string;
  description?: string;
};

export type TMCPRegistryServer = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category: string;
  transportType?: string;
  command: string;
  args: string[];
  requiredEnv?: string[];
  env?: Record<string, string>;
  docsUrl?: string;
  configUrl?: string;
  featured?: boolean;
};

export type TMCPRegistryResponse = {
  servers: TMCPRegistryServer[];
  categories: TMCPRegistryCategory[];
};

export type PrincipalSearchParams = {
  q: string;
  limit?: number;
  types?: Array<p.PrincipalType.USER | p.PrincipalType.GROUP | p.PrincipalType.ROLE>;
};

export type PrincipalSearchResponse = {
  query: string;
  limit: number;
  types?: Array<p.PrincipalType.USER | p.PrincipalType.GROUP | p.PrincipalType.ROLE>;
  results: p.TPrincipalSearchResult[];
  count: number;
  sources: {
    local: number;
    entra: number;
  };
};

export type AccessRole = {
  accessRoleId: p.AccessRoleIds;
  name: string;
  description: string;
  permBits: number;
};

export type AccessRolesResponse = AccessRole[];

export type ListRolesResponse = {
  roles: Array<{ _id?: string; name: string; description?: string }>;
  total: number;
  limit: number;
  offset?: number;
};

export interface MCPServerStatus {
  requiresOAuth: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface MCPConnectionStatusResponse {
  success: boolean;
  connectionStatus: Record<string, MCPServerStatus>;
}

export interface MCPServerConnectionStatusResponse {
  success: boolean;
  serverName: string;
  requiresOAuth: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
}

export interface MCPAuthValuesResponse {
  success: boolean;
  serverName: string;
  authValueFlags: Record<string, boolean>;
}

/**
 * User Favorites — pinned agents, models, and model specs.
 * Exactly one variant should be set per entry; exclusivity is enforced
 * server-side in FavoritesController. Shape is loose for state-update ergonomics.
 */
export type TUserFavorite = {
  agentId?: string;
  model?: string;
  endpoint?: string;
  spec?: string;
};

/* SharePoint Graph API Token */
export type GraphTokenParams = {
  scopes: string;
};

export type GraphTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};
