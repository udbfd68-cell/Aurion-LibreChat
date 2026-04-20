import { Schema } from 'mongoose';
import type { IProject } from '~/types/project';

const projectSchema: Schema<IProject> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    customInstructions: {
      type: String,
      maxlength: 10000,
    },
    knowledgeFileIds: {
      type: [String],
      default: [],
    },
    color: {
      type: String,
      maxlength: 20,
    },
    icon: {
      type: String,
      maxlength: 50,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    tenantId: {
      type: String,
      index: true,
    },
  },
  { timestamps: true },
);

projectSchema.index({ userId: 1, archivedAt: 1 });
projectSchema.index({ userId: 1, name: 1 }, { unique: true });

export default projectSchema;
