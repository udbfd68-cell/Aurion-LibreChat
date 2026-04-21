import type { TSkill } from 'librechat-data-provider';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@librechat/client';

type SkillCardProps = {
  skill: TSkill;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function SkillCard({ skill, onEdit, onDelete }: SkillCardProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-border-light p-3 transition-colors hover:bg-surface-secondary"
      style={{ borderLeftColor: skill.color || '#6b7280', borderLeftWidth: '3px' }}
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-tertiary text-lg">
        {skill.icon || '⚡'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium text-text-primary">{skill.name}</h3>
          {skill.isBuiltIn && (
            <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
              Built-in
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{skill.description}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] text-text-tertiary">
            {skill.category}
          </span>
          {skill.tools && skill.tools.length > 0 && (
            <span className="text-[10px] text-text-tertiary">
              {skill.tools.length} tool{skill.tools.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      {!skill.isBuiltIn && (
        <div className="flex flex-shrink-0 gap-1">
          {onEdit && (
            <Button size="sm" variant="ghost" onClick={onEdit} className="h-7 w-7 p-0">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
