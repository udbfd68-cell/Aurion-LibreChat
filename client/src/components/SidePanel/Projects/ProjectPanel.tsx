import { useMemo, useState } from 'react';
import { Plus, FolderOpen, Trash2, Archive, Pencil } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import { Button, Spinner, FilterInput, useToastContext } from '@librechat/client';
import type { TProject } from 'librechat-data-provider';
import {
  useProjectsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '~/data-provider';
import { useLocalize } from '~/hooks';
import ProjectDialog from './ProjectDialog';
import ProjectCard from './ProjectCard';

const pageSize = 10;

export default function ProjectPanel() {
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<TProject | null>(null);

  const { data: projects, isLoading } = useProjectsQuery();
  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const deleteMutation = useDeleteProjectMutation();

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery.trim()) return projects;
    return matchSorter(projects, searchQuery, { keys: ['name', 'description'] });
  }, [projects, searchQuery]);

  const paged = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const handleCreate = (data: { name: string; description?: string; customInstructions?: string }) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
        showToast({ message: 'Project created', status: 'success' });
      },
      onError: (err) => {
        showToast({ message: err.message || 'Failed to create project', status: 'error' });
      },
    });
  };

  const handleUpdate = (
    projectId: string,
    data: { name?: string; description?: string; customInstructions?: string },
  ) => {
    updateMutation.mutate(
      { projectId, data },
      {
        onSuccess: () => {
          setEditingProject(null);
          showToast({ message: 'Project updated', status: 'success' });
        },
        onError: (err) => {
          showToast({ message: err.message || 'Failed to update project', status: 'error' });
        },
      },
    );
  };

  const handleDelete = (projectId: string) => {
    deleteMutation.mutate(projectId, {
      onSuccess: () => {
        showToast({ message: 'Project deleted', status: 'success' });
      },
      onError: (err) => {
        showToast({ message: err.message || 'Failed to delete project', status: 'error' });
      },
    });
  };

  const handleArchive = (projectId: string) => {
    updateMutation.mutate(
      { projectId, data: { archivedAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          showToast({ message: 'Project archived', status: 'success' });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">
          {localize('com_ui_projects') || 'Projects'}
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingProject(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <FilterInput
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setPage(0);
        }}
        placeholder={localize('com_ui_search') || 'Search...'}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-secondary">
          <FolderOpen className="h-12 w-12 opacity-50" />
          <p className="text-sm">
            {projects?.length === 0
              ? 'No projects yet. Create one to get started.'
              : 'No matching projects.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {paged.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={() => {
                setEditingProject(project);
                setDialogOpen(true);
              }}
              onDelete={() => handleDelete(project._id)}
              onArchive={() => handleArchive(project._id)}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-light pt-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-xs text-text-secondary">
            {page + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editingProject}
        onSubmit={(data) => {
          if (editingProject) {
            handleUpdate(editingProject._id, data);
          } else {
            handleCreate(data);
          }
        }}
        isLoading={createMutation.isLoading || updateMutation.isLoading}
      />
    </div>
  );
}
