import { useMemo, useState } from 'react';
import { Plus, Zap, Trash2, Pencil } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import { Button, Spinner, FilterInput, useToastContext } from '@librechat/client';
import type { TSkill } from 'librechat-data-provider';
import {
  useSkillsQuery,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} from '~/data-provider';
import { useLocalize } from '~/hooks';
import SkillDialog from './SkillDialog';
import SkillCard from './SkillCard';

const pageSize = 10;

export default function SkillPanel() {
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<TSkill | null>(null);

  const { data: skills, isLoading } = useSkillsQuery();
  const createMutation = useCreateSkillMutation();
  const updateMutation = useUpdateSkillMutation();
  const deleteMutation = useDeleteSkillMutation();

  const filtered = useMemo(() => {
    if (!skills) return [];
    if (!searchQuery.trim()) return skills;
    return matchSorter(skills, searchQuery, {
      keys: ['name', 'description', 'category'],
    });
  }, [skills, searchQuery]);

  const paged = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const handleCreate = (data: Parameters<typeof createMutation.mutate>[0]) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
        showToast({ message: 'Skill created', status: 'success' });
      },
      onError: (err) => {
        showToast({ message: err.message || 'Failed to create skill', status: 'error' });
      },
    });
  };

  const handleUpdate = (
    skillId: string,
    data: Parameters<typeof updateMutation.mutate>[0]['data'],
  ) => {
    updateMutation.mutate(
      { skillId, data },
      {
        onSuccess: () => {
          setEditingSkill(null);
          setDialogOpen(false);
          showToast({ message: 'Skill updated', status: 'success' });
        },
        onError: (err) => {
          showToast({ message: err.message || 'Failed to update skill', status: 'error' });
        },
      },
    );
  };

  const handleDelete = (skillId: string) => {
    deleteMutation.mutate(skillId, {
      onSuccess: () => {
        showToast({ message: 'Skill deleted', status: 'success' });
      },
      onError: (err) => {
        showToast({ message: err.message || 'Failed to delete skill', status: 'error' });
      },
    });
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
          {localize('com_ui_skills') || 'Skills'}
        </h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingSkill(null);
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
          <Zap className="h-12 w-12 opacity-50" />
          <p className="text-sm">
            {skills?.length === 0
              ? 'No skills yet. Built-in skills will appear when seeded.'
              : 'No matching skills.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {paged.map((skill) => (
            <SkillCard
              key={skill._id}
              skill={skill}
              onEdit={() => {
                setEditingSkill(skill);
                setDialogOpen(true);
              }}
              onDelete={() => handleDelete(skill._id)}
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

      <SkillDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        skill={editingSkill}
        onSubmit={(data) => {
          if (editingSkill) {
            handleUpdate(editingSkill._id, data);
          } else {
            handleCreate(data);
          }
        }}
      />
    </div>
  );
}
