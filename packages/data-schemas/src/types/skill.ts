import type { Types, Document } from 'mongoose';

export interface ISkill extends Document {
  userId?: Types.ObjectId;
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
  tenantId?: string;
}

export interface ISkillLean {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSkillParams {
  userId: string | Types.ObjectId;
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
}

export interface UpdateSkillParams {
  skillId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
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
}

export interface DeleteSkillParams {
  skillId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
}

export interface ListSkillsParams {
  userId?: string | Types.ObjectId;
  category?: string;
  includeBuiltIn?: boolean;
}
