import { useState, useCallback, memo } from 'react';
import copy from 'copy-to-clipboard';
import { Globe, Code, Copy, Check, ExternalLink, X, Lock, Unlock } from 'lucide-react';
import { Button, useToastContext } from '@librechat/client';
import { useShareArtifactMutation } from '~/data-provider';
import { cn } from '~/utils';

interface ArtifactPublishDialogProps {
  artifactId: string;
  artifactTitle: string;
  shareId?: string;
  isPublic?: boolean;
  onClose: () => void;
}

/**
 * Claude.ai-style Artifact Publish Dialog.
 * - Toggle public/private
 * - Copy public URL
 * - Copy embed code
 * - Direct link to published artifact
 */
function ArtifactPublishDialog({
  artifactId,
  artifactTitle,
  shareId: initialShareId,
  isPublic: initialIsPublic,
  onClose,
}: ArtifactPublishDialogProps) {
  const { showToast } = useToastContext();
  const shareArtifact = useShareArtifactMutation();
  const [isPublic, setIsPublic] = useState(initialIsPublic ?? false);
  const [shareId, setShareId] = useState(initialShareId ?? '');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'embed'>('link');

  const shareUrl = shareId ? `${window.location.origin}/share/artifact/${shareId}` : '';
  const embedCode = shareId
    ? `<iframe src="${shareUrl}?embed=true" width="100%" height="600" frameborder="0" sandbox="allow-scripts allow-same-origin" style="border-radius: 12px; border: 1px solid #e5e7eb;"></iframe>`
    : '';

  const handlePublish = useCallback(() => {
    shareArtifact.mutate(
      { artifactId, isPublic: !isPublic },
      {
        onSuccess: (data: { shareId?: string }) => {
          if (data?.shareId) {
            setShareId(data.shareId);
            setIsPublic(true);
            showToast({ message: 'Artifact published!', status: 'success' });
          }
        },
        onError: () => {
          showToast({ message: 'Failed to publish', status: 'error' });
        },
      },
    );
  }, [artifactId, isPublic, shareArtifact, showToast]);

  const handleUnpublish = useCallback(() => {
    shareArtifact.mutate(
      { artifactId, isPublic: false },
      {
        onSuccess: () => {
          setIsPublic(false);
          showToast({ message: 'Artifact unpublished', status: 'info' });
        },
      },
    );
  }, [artifactId, shareArtifact, showToast]);

  const handleCopyUrl = useCallback(() => {
    copy(shareUrl, { format: 'text/plain' });
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [shareUrl]);

  const handleCopyEmbed = useCallback(() => {
    copy(embedCode, { format: 'text/plain' });
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }, [embedCode]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-border-light bg-surface-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-600" />
            <div>
              <h2 className="text-sm font-semibold text-text-primary">Publish Artifact</h2>
              <p className="text-xs text-text-secondary">{artifactTitle}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status */}
        <div className="px-5 py-4">
          <div
            className={cn(
              'flex items-center justify-between rounded-xl p-3',
              isPublic ? 'bg-green-500/10' : 'bg-surface-secondary',
            )}
          >
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Unlock className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-text-tertiary" />
              )}
              <span className="text-sm font-medium text-text-primary">
                {isPublic ? 'Published' : 'Private'}
              </span>
            </div>
            <Button
              size="sm"
              variant={isPublic ? 'outline' : 'default'}
              onClick={isPublic ? handleUnpublish : handlePublish}
              disabled={shareArtifact.isLoading}
              className={cn(!isPublic && 'bg-green-600 hover:bg-green-700')}
            >
              {shareArtifact.isLoading ? 'Loading...' : isPublic ? 'Unpublish' : 'Publish'}
            </Button>
          </div>

          {/* Tabs: Link / Embed */}
          {isPublic && shareId && (
            <>
              <div className="mt-4 flex gap-1 rounded-lg bg-surface-secondary p-0.5">
                <button
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    activeTab === 'link'
                      ? 'bg-surface-primary text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                  onClick={() => setActiveTab('link')}
                >
                  <ExternalLink className="mr-1 inline h-3 w-3" />
                  Share Link
                </button>
                <button
                  className={cn(
                    'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    activeTab === 'embed'
                      ? 'bg-surface-primary text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                  onClick={() => setActiveTab('embed')}
                >
                  <Code className="mr-1 inline h-3 w-3" />
                  Embed Code
                </button>
              </div>

              {activeTab === 'link' ? (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      className="flex-1 rounded-lg border border-border-medium bg-surface-secondary px-3 py-2 text-xs font-mono text-text-primary"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1"
                      onClick={handleCopyUrl}
                    >
                      {copiedUrl ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedUrl ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-xs text-green-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in new tab
                  </a>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="relative">
                    <pre className="max-h-32 overflow-auto rounded-lg border border-border-medium bg-surface-secondary p-3 text-[10px] leading-relaxed font-mono text-text-secondary">
                      {embedCode}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute right-2 top-2 flex items-center gap-1"
                      onClick={handleCopyEmbed}
                    >
                      {copiedEmbed ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-[10px] text-text-tertiary">
                    Paste this code into any HTML page to embed this artifact.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ArtifactPublishDialog);
