import { Schema } from 'mongoose';
import type { IArtifact } from '~/types/artifact';

const artifactSchema: Schema<IArtifact> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    identifier: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 500,
    },
    type: {
      type: String,
      required: true,
    },
    language: {
      type: String,
    },
    content: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Artifact',
      default: null,
    },
    shareId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

artifactSchema.index({ userId: 1, conversationId: 1 });
artifactSchema.index({ userId: 1, identifier: 1, version: 1 });
artifactSchema.index({ shareId: 1 }, { sparse: true });

export default artifactSchema;
