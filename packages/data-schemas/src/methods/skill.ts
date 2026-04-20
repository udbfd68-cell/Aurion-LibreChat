import logger from '~/config/winston';
import type * as t from '~/types';

export interface SkillMethods {
  createSkill: (params: t.CreateSkillParams) => Promise<t.ISkillLean>;
  getSkill: (params: { skillId: string; userId?: string }) => Promise<t.ISkillLean | null>;
  listSkills: (params: t.ListSkillsParams) => Promise<t.ISkillLean[]>;
  updateSkill: (params: t.UpdateSkillParams) => Promise<t.ISkillLean | null>;
  deleteSkill: (params: t.DeleteSkillParams) => Promise<{ ok: boolean }>;
  seedBuiltInSkills: () => Promise<void>;
}

const BUILT_IN_SKILLS = [
  {
    name: 'Analysis',
    description: 'Deep analytical thinking for complex problems',
    systemPrompt:
      'You are an expert analyst. Break down complex problems into components, identify patterns, evaluate evidence, and provide clear, structured analysis. Use data-driven reasoning.',
    icon: '🔍',
    color: '#3b82f6',
    category: 'reasoning',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Creative Writing',
    description: 'Craft compelling stories, articles, and creative content',
    systemPrompt:
      'You are a skilled creative writer. Write with vivid imagery, compelling narratives, and strong voice. Adapt your style to the requested genre and tone.',
    icon: '✍️',
    color: '#8b5cf6',
    category: 'writing',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Code Review',
    description: 'Review code for bugs, performance, and best practices',
    systemPrompt:
      'You are a senior software engineer conducting code review. Identify bugs, security vulnerabilities, performance issues, and style problems. Suggest specific improvements with code examples.',
    icon: '🔧',
    color: '#10b981',
    category: 'coding',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Research',
    description: 'Comprehensive research and fact-finding',
    systemPrompt:
      'You are a thorough researcher. Provide well-sourced, balanced information. Distinguish between established facts and opinions. Cite your reasoning and note limitations.',
    icon: '📚',
    color: '#f59e0b',
    category: 'research',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Technical Docs',
    description: 'Write clear technical documentation and specifications',
    systemPrompt:
      'You are a technical documentation expert. Write clear, concise, well-structured documentation. Use proper formatting, code examples, and diagrams where appropriate.',
    icon: '📋',
    color: '#06b6d4',
    category: 'writing',
    isBuiltIn: true,
    isPublic: true,
  },
  {
    name: 'Data Science',
    description: 'Statistical analysis, ML, and data visualization guidance',
    systemPrompt:
      'You are a data science expert. Help with statistical analysis, machine learning, data visualization, and data engineering. Provide code in Python with pandas, scikit-learn, matplotlib.',
    icon: '📊',
    color: '#ec4899',
    category: 'coding',
    isBuiltIn: true,
    isPublic: true,
  },
];

export function createSkillMethods(mongoose: typeof import('mongoose')): SkillMethods {
  async function createSkill(params: t.CreateSkillParams): Promise<t.ISkillLean> {
    try {
      const Skill = mongoose.models.Skill;
      const doc = await Skill.create({
        userId: params.userId,
        name: params.name,
        description: params.description,
        systemPrompt: params.systemPrompt,
        icon: params.icon,
        color: params.color,
        category: params.category || 'general',
        tools: params.tools || [],
        modelConfig: params.modelConfig,
      });
      return doc.toObject();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error('A skill with this name already exists');
      }
      throw new Error(
        `Failed to create skill: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async function getSkill(params: {
    skillId: string;
    userId?: string;
  }): Promise<t.ISkillLean | null> {
    try {
      const Skill = mongoose.models.Skill;
      const skill = await Skill.findById(params.skillId).lean();
      if (!skill) return null;
      // Users can access built-in, public, or their own skills
      if (
        skill.isBuiltIn ||
        skill.isPublic ||
        (params.userId && String(skill.userId) === String(params.userId))
      ) {
        return skill;
      }
      return null;
    } catch (error) {
      logger.error('[getSkill]', error);
      return null;
    }
  }

  async function listSkills(params: t.ListSkillsParams): Promise<t.ISkillLean[]> {
    try {
      const Skill = mongoose.models.Skill;
      const conditions: Record<string, unknown>[] = [];

      // Always include built-in skills if requested (or by default)
      if (params.includeBuiltIn !== false) {
        conditions.push({ isBuiltIn: true });
      }
      // Include public skills
      conditions.push({ isPublic: true });
      // Include user's own skills
      if (params.userId) {
        conditions.push({ userId: params.userId });
      }

      const filter: Record<string, unknown> = { $or: conditions };
      if (params.category) {
        filter.category = params.category;
      }

      return await Skill.find(filter).sort({ isBuiltIn: -1, name: 1 }).lean();
    } catch (error) {
      logger.error('[listSkills]', error);
      return [];
    }
  }

  async function updateSkill(params: t.UpdateSkillParams): Promise<t.ISkillLean | null> {
    try {
      const Skill = mongoose.models.Skill;
      const update: Record<string, unknown> = {};
      if (params.name !== undefined) update.name = params.name;
      if (params.description !== undefined) update.description = params.description;
      if (params.systemPrompt !== undefined) update.systemPrompt = params.systemPrompt;
      if (params.icon !== undefined) update.icon = params.icon;
      if (params.color !== undefined) update.color = params.color;
      if (params.category !== undefined) update.category = params.category;
      if (params.tools !== undefined) update.tools = params.tools;
      if (params.modelConfig !== undefined) update.modelConfig = params.modelConfig;

      return await Skill.findOneAndUpdate(
        { _id: params.skillId, userId: params.userId, isBuiltIn: false },
        update,
        { new: true },
      ).lean();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error('A skill with this name already exists');
      }
      throw new Error(
        `Failed to update skill: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async function deleteSkill(params: t.DeleteSkillParams): Promise<{ ok: boolean }> {
    try {
      const Skill = mongoose.models.Skill;
      const result = await Skill.findOneAndDelete({
        _id: params.skillId,
        userId: params.userId,
        isBuiltIn: false,
      });
      return { ok: !!result };
    } catch (error) {
      logger.error('[deleteSkill]', error);
      return { ok: false };
    }
  }

  async function seedBuiltInSkills(): Promise<void> {
    try {
      const Skill = mongoose.models.Skill;
      for (const skill of BUILT_IN_SKILLS) {
        await Skill.findOneAndUpdate({ name: skill.name, isBuiltIn: true }, skill, {
          upsert: true,
        });
      }
      logger.info(`[seedBuiltInSkills] Seeded ${BUILT_IN_SKILLS.length} built-in skills`);
    } catch (error) {
      logger.error('[seedBuiltInSkills] Error:', error);
    }
  }

  return {
    createSkill,
    getSkill,
    listSkills,
    updateSkill,
    deleteSkill,
    seedBuiltInSkills,
  };
}
