import type { Types, Document } from 'mongoose';

export interface IArtifact extends Document {
  userId: Types.ObjectId;
  conversationId: string;
  messageId: string;
  identifier: string;
  title: string;
  type: string;
  language?: string;
  content: string;
  version: number;
  parentId?: Types.ObjectId;
  shareId?: string;
  isPublic: boolean;
  tenantId?: string;
}

export interface IArtifactLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  conversationId: string;
  messageId: string;
  identifier: string;
  title: string;
  type: string;
  language?: string;
  content: string;
  version: number;
  parentId?: Types.ObjectId;
  shareId?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveArtifactParams {
  userId: string | Types.ObjectId;
  conversationId: string;
  messageId: string;
  identifier: string;
  title: string;
  type: string;
  language?: string;
  content: string;
}

export interface GetArtifactParams {
  artifactId: string | Types.ObjectId;
  userId?: string | Types.ObjectId;
}

export interface ListArtifactsParams {
  userId: string | Types.ObjectId;
  conversationId?: string;
}

export interface ShareArtifactParams {
  artifactId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  isPublic: boolean;
}

export interface GetSharedArtifactParams {
  shareId: string;
}
