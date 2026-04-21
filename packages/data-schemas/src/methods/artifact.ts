import { randomUUID } from 'crypto';
import logger from '~/config/winston';
import type * as t from '~/types';

export interface ArtifactMethods {
  saveArtifact: (params: t.SaveArtifactParams) => Promise<t.IArtifactLean>;
  getArtifact: (params: t.GetArtifactParams) => Promise<t.IArtifactLean | null>;
  listArtifacts: (params: t.ListArtifactsParams) => Promise<t.IArtifactLean[]>;
  getArtifactVersions: (params: { userId: string; identifier: string }) => Promise<t.IArtifactLean[]>;
  shareArtifact: (params: t.ShareArtifactParams) => Promise<t.IArtifactLean | null>;
  getSharedArtifact: (params: t.GetSharedArtifactParams) => Promise<t.IArtifactLean | null>;
}

export function createArtifactMethods(mongoose: typeof import('mongoose')): ArtifactMethods {
  async function saveArtifact(params: t.SaveArtifactParams): Promise<t.IArtifactLean> {
    try {
      const Artifact = mongoose.models.Artifact;

      // Find the latest version for this identifier
      const latest = await Artifact.findOne({
        userId: params.userId,
        identifier: params.identifier,
      })
        .sort({ version: -1 })
        .lean();

      const version = latest ? latest.version + 1 : 1;
      const parentId = latest ? latest._id : undefined;

      const doc = await Artifact.create({
        userId: params.userId,
        conversationId: params.conversationId,
        messageId: params.messageId,
        identifier: params.identifier,
        title: params.title,
        type: params.type,
        language: params.language,
        content: params.content,
        version,
        parentId,
      });
      return doc.toObject();
    } catch (error) {
      throw new Error(
        `Failed to save artifact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async function getArtifact(params: t.GetArtifactParams): Promise<t.IArtifactLean | null> {
    try {
      const Artifact = mongoose.models.Artifact;
      const filter: Record<string, unknown> = { _id: params.artifactId };
      if (params.userId) {
        filter.userId = params.userId;
      }
      return await Artifact.findOne(filter).lean();
    } catch (error) {
      logger.error('[getArtifact]', error);
      return null;
    }
  }

  async function listArtifacts(params: t.ListArtifactsParams): Promise<t.IArtifactLean[]> {
    try {
      const Artifact = mongoose.models.Artifact;
      const filter: Record<string, unknown> = { userId: params.userId };
      if (params.conversationId) {
        filter.conversationId = params.conversationId;
      }
      return await Artifact.find(filter).sort({ createdAt: -1 }).lean();
    } catch (error) {
      logger.error('[listArtifacts]', error);
      return [];
    }
  }

  async function getArtifactVersions(params: {
    userId: string;
    identifier: string;
  }): Promise<t.IArtifactLean[]> {
    try {
      const Artifact = mongoose.models.Artifact;
      return await Artifact.find({
        userId: params.userId,
        identifier: params.identifier,
      })
        .sort({ version: 1 })
        .lean();
    } catch (error) {
      logger.error('[getArtifactVersions]', error);
      return [];
    }
  }

  async function shareArtifact(params: t.ShareArtifactParams): Promise<t.IArtifactLean | null> {
    try {
      const Artifact = mongoose.models.Artifact;
      const update: Record<string, unknown> = { isPublic: params.isPublic };
      if (params.isPublic) {
        update.shareId = randomUUID();
      } else {
        update.shareId = null;
      }
      return await Artifact.findOneAndUpdate(
        { _id: params.artifactId, userId: params.userId },
        update,
        { new: true },
      ).lean();
    } catch (error) {
      logger.error('[shareArtifact]', error);
      return null;
    }
  }

  async function getSharedArtifact(
    params: t.GetSharedArtifactParams,
  ): Promise<t.IArtifactLean | null> {
    try {
      const Artifact = mongoose.models.Artifact;
      return await Artifact.findOne({ shareId: params.shareId, isPublic: true }).lean();
    } catch (error) {
      logger.error('[getSharedArtifact]', error);
      return null;
    }
  }

  return {
    saveArtifact,
    getArtifact,
    listArtifacts,
    getArtifactVersions,
    shareArtifact,
    getSharedArtifact,
  };
}
