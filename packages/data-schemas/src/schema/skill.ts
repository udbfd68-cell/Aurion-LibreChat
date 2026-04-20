import { Schema } from 'mongoose';
import type { ISkill } from '~/types/skill';

const skillSchema: Schema<ISkill> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    systemPrompt: {
      type: String,
      required: true,
      maxlength: 50000,
    },
    icon: {
      type: String,
      maxlength: 50,
    },
    color: {
      type: String,
      maxlength: 20,
    },
    category: {
      type: String,
      default: 'general',
      maxlength: 50,
    },
    isBuiltIn: {
      type: Boolean,
      default: false,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tools: {
      type: [String],
      default: [],
    },
    modelConfig: {
      temperature: { type: Number },
      maxTokens: { type: Number },
      topP: { type: Number },
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

skillSchema.index({ isBuiltIn: 1, isPublic: 1 });
skillSchema.index({ userId: 1, name: 1 }, { unique: true, sparse: true });
skillSchema.index({ category: 1 });

export default skillSchema;
