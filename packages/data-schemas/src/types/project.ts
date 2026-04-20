import type { Types, Document } from 'mongoose';

export interface IProject extends Document {
  userId: Types.ObjectId;
  name: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds: string[];
  color?: string;
  icon?: string;
  archivedAt?: Date | null;
  tenantId?: string;
}

export interface IProjectLean {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds: string[];
  color?: string;
  icon?: string;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectParams {
  userId: string | Types.ObjectId;
  name: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds?: string[];
  color?: string;
  icon?: string;
}

export interface UpdateProjectParams {
  projectId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  name?: string;
  description?: string;
  customInstructions?: string;
  knowledgeFileIds?: string[];
  color?: string;
  icon?: string;
  archivedAt?: Date | null;
}

export interface DeleteProjectParams {
  projectId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
}

export interface GetProjectParams {
  projectId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
}

export interface ListProjectsParams {
  userId: string | Types.ObjectId;
  includeArchived?: boolean;
}
