import logger from '~/config/winston';
import type * as t from '~/types';

export interface ProjectMethods {
  createProject: (params: t.CreateProjectParams) => Promise<t.IProjectLean>;
  getProject: (params: t.GetProjectParams) => Promise<t.IProjectLean | null>;
  listProjects: (params: t.ListProjectsParams) => Promise<t.IProjectLean[]>;
  updateProject: (params: t.UpdateProjectParams) => Promise<t.IProjectLean | null>;
  deleteProject: (params: t.DeleteProjectParams) => Promise<{ ok: boolean }>;
}

export function createProjectMethods(mongoose: typeof import('mongoose')): ProjectMethods {
  async function createProject(params: t.CreateProjectParams): Promise<t.IProjectLean> {
    try {
      const Project = mongoose.models.Project;
      const doc = await Project.create({
        userId: params.userId,
        name: params.name,
        description: params.description,
        customInstructions: params.customInstructions,
        knowledgeFileIds: params.knowledgeFileIds ?? [],
        color: params.color,
        icon: params.icon,
      });
      return doc.toObject();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error('A project with this name already exists');
      }
      throw new Error(
        `Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async function getProject(params: t.GetProjectParams): Promise<t.IProjectLean | null> {
    try {
      const Project = mongoose.models.Project;
      return await Project.findOne({
        _id: params.projectId,
        userId: params.userId,
      }).lean();
    } catch (error) {
      logger.error('[getProject]', error);
      return null;
    }
  }

  async function listProjects(params: t.ListProjectsParams): Promise<t.IProjectLean[]> {
    try {
      const Project = mongoose.models.Project;
      const filter: Record<string, unknown> = { userId: params.userId };
      if (!params.includeArchived) {
        filter.archivedAt = null;
      }
      return await Project.find(filter).sort({ updatedAt: -1 }).lean();
    } catch (error) {
      logger.error('[listProjects]', error);
      return [];
    }
  }

  async function updateProject(params: t.UpdateProjectParams): Promise<t.IProjectLean | null> {
    try {
      const Project = mongoose.models.Project;
      const update: Record<string, unknown> = {};
      if (params.name !== undefined) {
        update.name = params.name;
      }
      if (params.description !== undefined) {
        update.description = params.description;
      }
      if (params.customInstructions !== undefined) {
        update.customInstructions = params.customInstructions;
      }
      if (params.knowledgeFileIds !== undefined) {
        update.knowledgeFileIds = params.knowledgeFileIds;
      }
      if (params.color !== undefined) {
        update.color = params.color;
      }
      if (params.icon !== undefined) {
        update.icon = params.icon;
      }
      if (params.archivedAt !== undefined) {
        update.archivedAt = params.archivedAt;
      }

      return await Project.findOneAndUpdate(
        { _id: params.projectId, userId: params.userId },
        update,
        { new: true },
      ).lean();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error('A project with this name already exists');
      }
      throw new Error(
        `Failed to update project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async function deleteProject(params: t.DeleteProjectParams): Promise<{ ok: boolean }> {
    try {
      const Project = mongoose.models.Project;
      const result = await Project.findOneAndDelete({
        _id: params.projectId,
        userId: params.userId,
      });
      return { ok: !!result };
    } catch (error) {
      logger.error('[deleteProject]', error);
      return { ok: false };
    }
  }

  return {
    createProject,
    getProject,
    listProjects,
    updateProject,
    deleteProject,
  };
}
