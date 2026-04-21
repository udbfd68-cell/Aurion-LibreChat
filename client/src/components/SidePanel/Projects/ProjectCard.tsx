import { FolderOpen, Pencil, Trash2, Archive } from 'lucide-react';
import { Button } from '@librechat/client';
import type { TProject } from 'librechat-data-provider';

interface ProjectCardProps {
  project: TProject;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

export default function ProjectCard({ project, onEdit, onDelete, onArchive }: ProjectCardProps) {
  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border-light p-3 transition-colors hover:bg-surface-secondary">
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: project.color || '#6366f1' }}
      >
        <FolderOpen className="h-4 w-4 text-white" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-text-primary">{project.name}</h3>
        {project.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{project.description}</p>
        )}
        {project.customInstructions && (
          <p className="mt-1 text-xs italic text-text-tertiary">Has custom instructions</p>
        )}
      </div>

      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onArchive} title="Archive">
          <Archive className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} title="Delete">
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
    </div>
  );
}
