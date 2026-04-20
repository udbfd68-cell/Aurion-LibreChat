import { useState, useEffect } from 'react';
import { OGDialog, OGDialogTemplate, Button, Label, Input, Spinner } from '@librechat/client';
import type { TProject } from 'librechat-data-provider';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: TProject | null;
  onSubmit: (data: { name: string; description?: string; customInstructions?: string }) => void;
  isLoading: boolean;
}

export default function ProjectDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
  isLoading,
}: ProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setCustomInstructions(project.customInstructions || '');
    } else {
      setName('');
      setDescription('');
      setCustomInstructions('');
    }
  }, [project, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      customInstructions: customInstructions.trim() || undefined,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogTemplate
        title={project ? 'Edit Project' : 'New Project'}
        className="w-full max-w-md"
        main={
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="project-name" className="mb-1 text-sm font-medium">
                Name
              </Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Project"
                maxLength={200}
                required
              />
            </div>
            <div>
              <Label htmlFor="project-description" className="mb-1 text-sm font-medium">
                Description
              </Label>
              <Input
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                maxLength={2000}
              />
            </div>
            <div>
              <Label htmlFor="project-instructions" className="mb-1 text-sm font-medium">
                Custom Instructions
              </Label>
              <textarea
                id="project-instructions"
                className="min-h-[100px] w-full rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-border-heavy focus:outline-none"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Instructions that apply to all conversations in this project..."
                maxLength={10000}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isLoading}>
                {isLoading ? <Spinner className="h-4 w-4" /> : project ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        }
      />
    </OGDialog>
  );
}
