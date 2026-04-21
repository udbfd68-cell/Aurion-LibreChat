import { useState, useEffect } from 'react';
import type { CreateSkillPayload, TSkill } from 'librechat-data-provider';
import { OGDialog, OGDialogTemplate, Button, Label, Input } from '@librechat/client';

type SkillDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill?: TSkill | null;
  onSubmit: (data: CreateSkillPayload) => void;
};

export default function SkillDialog({ open, onOpenChange, skill, onSubmit }: SkillDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [category, setCategory] = useState('general');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6b7280');

  useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDescription(skill.description);
      setSystemPrompt(skill.systemPrompt);
      setCategory(skill.category);
      setIcon(skill.icon || '');
      setColor(skill.color || '#6b7280');
    } else {
      setName('');
      setDescription('');
      setSystemPrompt('');
      setCategory('general');
      setIcon('');
      setColor('#6b7280');
    }
  }, [skill, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !systemPrompt.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      category: category.trim() || 'general',
      icon: icon || undefined,
      color: color || undefined,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogTemplate
        title={skill ? 'Edit Skill' : 'Create Skill'}
        className="w-full max-w-lg"
        main={
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="skill-name" className="mb-1 text-sm font-medium">Name</Label>
              <Input
                id="skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Data Analyst"
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label htmlFor="skill-desc" className="mb-1 text-sm font-medium">Description</Label>
              <Input
                id="skill-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this skill do?"
                required
                maxLength={2000}
              />
            </div>
            <div>
              <Label htmlFor="skill-prompt" className="mb-1 text-sm font-medium">System Prompt</Label>
              <textarea
                id="skill-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Instructions for the AI when using this skill..."
                required
                rows={4}
                maxLength={50000}
                className="min-h-[100px] w-full rounded-md border border-border-light bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:border-border-heavy focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="skill-category" className="mb-1 text-sm font-medium">Category</Label>
                <Input
                  id="skill-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. coding, writing"
                  maxLength={50}
                />
              </div>
              <div className="w-20">
                <Label htmlFor="skill-icon" className="mb-1 text-sm font-medium">Icon</Label>
                <Input
                  id="skill-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🔧"
                  maxLength={4}
                />
              </div>
              <div className="w-20">
                <Label htmlFor="skill-color" className="mb-1 text-sm font-medium">Color</Label>
                <input
                  id="skill-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-border-medium"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || !description.trim() || !systemPrompt.trim()}>
                {skill ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        }
      />
    </OGDialog>
  );
}
