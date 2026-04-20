import { useRef, useState, useEffect, useCallback } from 'react';
import copy from 'copy-to-clipboard';
import * as Tabs from '@radix-ui/react-tabs';
import { Code, Play, RefreshCw, X, Share2, Check, Bug, Wand2 } from 'lucide-react';
import { useSetRecoilState, useResetRecoilState } from 'recoil';
import { Button, Spinner, useMediaQuery, Radio, useToastContext } from '@librechat/client';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react';
import CopyButton from '~/components/Messages/Content/CopyButton';
import ExportActions from '~/components/Artifacts/ExportActions';
import { useShareContext, useMutationState } from '~/Providers';
import { useShareArtifactMutation } from '~/data-provider';
import useArtifacts from '~/hooks/Artifacts/useArtifacts';
import DownloadArtifact from './DownloadArtifact';
import ArtifactVersion from './ArtifactVersion';
import ArtifactTabs from './ArtifactTabs';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

const MAX_BLUR_AMOUNT = 32;
const MAX_BACKDROP_OPACITY = 0.3;

export default function Artifacts() {
  const localize = useLocalize();
  const { isMutating } = useMutationState();
  const { isSharedConvo } = useShareContext();
  const isMobile = useMediaQuery('(max-width: 868px)');
  const previewRef = useRef<SandpackPreviewRef>();
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [height, setHeight] = useState(90);
  const [isDragging, setIsDragging] = useState(false);
  const [blurAmount, setBlurAmount] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [sandboxError, setSandboxError] = useState<string | null>(null);
  const [showLinkConfirm, setShowLinkConfirm] = useState<string | null>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(90);
  const setArtifactsVisible = useSetRecoilState(store.artifactsVisibility);
  const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);

  const tabOptions = [
    {
      value: 'code',
      label: localize('com_ui_code'),
      icon: <Code className="size-4" />,
    },
    {
      value: 'preview',
      label: localize('com_ui_preview'),
      icon: <Play className="size-4" />,
    },
  ];

  useEffect(() => {
    setIsMounted(true);
    const delay = isMobile ? 50 : 30;
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      setBlurAmount(0);
      return;
    }

    const minHeightForBlur = 50;
    const maxHeightForBlur = 100;

    if (height <= minHeightForBlur) {
      setBlurAmount(0);
    } else if (height >= maxHeightForBlur) {
      setBlurAmount(MAX_BLUR_AMOUNT);
    } else {
      const progress = (height - minHeightForBlur) / (maxHeightForBlur - minHeightForBlur);
      setBlurAmount(Math.round(progress * MAX_BLUR_AMOUNT));
    }
  }, [height, isMobile]);

  // Claude.ai-style sandbox postMessage bridge
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data.type !== 'string') {
        return;
      }
      switch (event.data.type) {
        case 'ARTIFACT_ERROR':
          setSandboxError(event.data.message || 'An error occurred in the artifact');
          break;
        case 'ARTIFACT_OPEN_LINK':
          if (event.data.url && typeof event.data.url === 'string') {
            setShowLinkConfirm(event.data.url);
          }
          break;
        case 'ARTIFACT_STORAGE_GET': {
          const key = event.data.key;
          const stored = localStorage.getItem(`artifact_${currentArtifact?.id}_${key}`);
          const client = previewRef.current?.getClient();
          if (client) {
            client.dispatch({
              type: 'action',
              action: 'ARTIFACT_STORAGE_RESULT',
              payload: { key, value: stored },
            } as unknown as Parameters<typeof client.dispatch>[0]);
          }
          break;
        }
        case 'ARTIFACT_STORAGE_SET': {
          const { key, value } = event.data;
          if (typeof key === 'string' && currentArtifact?.id) {
            localStorage.setItem(`artifact_${currentArtifact.id}_${key}`, String(value));
          }
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentArtifact?.id]);

  const handleTryFix = useCallback(() => {
    if (!sandboxError) {
      return;
    }
    // Copy error to clipboard so user can paste it
    copy(`Fix this error in my artifact:\n\n${sandboxError}`, { format: 'text/plain' });
    showToast({
      message: 'Error copied — paste in chat to fix with Claude',
      status: 'info',
    });
    setSandboxError(null);
  }, [sandboxError, showToast]);

  const handleConfirmLink = useCallback(() => {
    if (showLinkConfirm) {
      window.open(showLinkConfirm, '_blank', 'noopener,noreferrer');
      setShowLinkConfirm(null);
    }
  }, [showLinkConfirm]);

  const {
    activeTab,
    setActiveTab,
    currentIndex,
    currentArtifact,
    orderedArtifactIds,
    setCurrentArtifactId,
  } = useArtifacts();

  const handleCopyArtifact = useCallback(() => {
    const content = currentArtifact?.content ?? '';
    if (!content) {
      return;
    }
    copy(content, { format: 'text/plain' });
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  }, [currentArtifact?.content]);

  const { showToast } = useToastContext();
  const shareArtifact = useShareArtifactMutation();
  const [isShared, setIsShared] = useState(false);

  const handleShareArtifact = useCallback(() => {
    const id = currentArtifact?.id;
    if (!id || isSharedConvo) {
      return;
    }
    shareArtifact.mutate(
      { artifactId: id, isPublic: true },
      {
        onSuccess: (data: { shareId?: string }) => {
          if (data?.shareId) {
            const shareUrl = `${window.location.origin}/share/artifact/${data.shareId}`;
            copy(shareUrl, { format: 'text/plain' });
            setIsShared(true);
            showToast({
              message: localize('com_ui_artifact_shared') || 'Share link copied!',
              status: 'success',
            });
            setTimeout(() => setIsShared(false), 3000);
          }
        },
      },
    );
  }, [currentArtifact?.id, isSharedConvo, shareArtifact, showToast, localize]);

  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartHeight.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) {
      return;
    }

    const deltaY = dragStartY.current - e.clientY;
    const viewportHeight = window.innerHeight;
    const deltaPercentage = (deltaY / viewportHeight) * 100;
    const newHeight = Math.max(10, Math.min(100, dragStartHeight.current + deltaPercentage));

    setHeight(newHeight);
  };

  const handleDragEnd = (e: React.PointerEvent) => {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Snap to positions based on final height
    if (height < 30) {
      closeArtifacts();
    } else if (height > 95) {
      setHeight(100);
    } else if (height < 60) {
      setHeight(50);
    } else {
      setHeight(90);
    }
  };

  if (!currentArtifact || !isMounted) {
    return null;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    const client = previewRef.current?.getClient();
    if (client) {
      client.dispatch({ type: 'refresh' });
    }
    setTimeout(() => setIsRefreshing(false), 750);
  };

  const closeArtifacts = () => {
    if (isMobile) {
      setIsClosing(true);
      setIsVisible(false);
      setTimeout(() => {
        setArtifactsVisible(false);
        setIsClosing(false);
        setHeight(90);
      }, 250);
    } else {
      resetCurrentArtifactId();
      setArtifactsVisible(false);
    }
  };

  const backdropOpacity =
    blurAmount > 0
      ? (Math.min(blurAmount, MAX_BLUR_AMOUNT) / MAX_BLUR_AMOUNT) * MAX_BACKDROP_OPACITY
      : 0;

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} asChild>
      <div className="flex h-full w-full flex-col">
        {/* Mobile backdrop with dynamic blur */}
        {isMobile && (
          <div
            className={cn(
              'fixed inset-0 z-[99] bg-black will-change-[opacity,backdrop-filter]',
              isVisible && !isClosing
                ? 'transition-all duration-300'
                : 'pointer-events-none opacity-0 backdrop-blur-none transition-opacity duration-150',
              blurAmount < 8 && isVisible && !isClosing ? 'pointer-events-none' : '',
            )}
            style={{
              opacity: isVisible && !isClosing ? backdropOpacity : 0,
              backdropFilter: isVisible && !isClosing ? `blur(${blurAmount}px)` : 'none',
              WebkitBackdropFilter: isVisible && !isClosing ? `blur(${blurAmount}px)` : 'none',
            }}
            onClick={blurAmount >= 8 ? closeArtifacts : undefined}
            aria-hidden="true"
          />
        )}
        <div
          className={cn(
            'flex w-full flex-col bg-surface-primary text-xl text-text-primary',
            isMobile
              ? cn(
                  'fixed inset-x-0 bottom-0 z-[100] rounded-t-[20px] shadow-[0_-10px_60px_rgba(0,0,0,0.35)]',
                  isVisible && !isClosing
                    ? 'translate-y-0 opacity-100'
                    : 'duration-250 translate-y-full opacity-0 transition-all',
                  isDragging ? '' : 'transition-all duration-300',
                )
              : cn(
                  'h-full shadow-2xl',
                  isVisible && !isClosing
                    ? 'duration-350 translate-x-0 opacity-100 transition-all'
                    : 'translate-x-5 opacity-0 transition-all duration-300',
                ),
          )}
          style={isMobile ? { height: `${height}vh` } : { overflow: 'hidden' }}
        >
          {isMobile && (
            <div
              className="flex flex-shrink-0 cursor-grab items-center justify-center bg-surface-primary-alt pb-1.5 pt-2.5 active:cursor-grabbing"
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
            >
              <div className="h-1 w-12 rounded-full bg-border-xheavy opacity-40 transition-all duration-200 active:opacity-60" />
            </div>
          )}

          {/* Header */}
          <div
            className={cn(
              'flex h-[52px] flex-shrink-0 items-center justify-between gap-2 border-b border-border-light bg-surface-primary-alt p-2 transition-all duration-300',
              isMobile ? 'justify-center' : 'overflow-hidden',
            )}
          >
            {!isMobile && (
              <div
                className={cn(
                  'flex items-center transition-all duration-500',
                  isVisible && !isClosing
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-2 opacity-0',
                )}
              >
                <Radio
                  options={tabOptions}
                  value={activeTab}
                  onChange={setActiveTab}
                  disabled={isMutating && activeTab !== 'code'}
                  buttonClassName="h-9 px-3 gap-1.5"
                />
              </div>
            )}

            <div
              className={cn(
                'flex items-center gap-2 transition-all duration-500',
                isMobile ? 'min-w-max' : '',
                isVisible && !isClosing ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0',
              )}
            >
              {activeTab === 'preview' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label={localize('com_ui_refresh')}
                >
                  {isRefreshing ? (
                    <Spinner size={16} />
                  ) : (
                    <RefreshCw
                      size={16}
                      className="transition-transform duration-200"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              )}
              {activeTab !== 'preview' && isMutating && (
                <RefreshCw size={16} className="animate-spin text-text-secondary" />
              )}
              {orderedArtifactIds.length > 1 && (
                <ArtifactVersion
                  currentIndex={currentIndex}
                  totalVersions={orderedArtifactIds.length}
                  onVersionChange={(index) => {
                    const target = orderedArtifactIds[index];
                    if (target) {
                      setCurrentArtifactId(target);
                    }
                  }}
                />
              )}
              <CopyButton isCopied={isCopied} iconOnly onClick={handleCopyArtifact} />
              {/* Context-aware export — auto-detects content type */}
              {currentArtifact?.content && (
                <ExportActions
                  content={currentArtifact.content}
                  title={currentArtifact.title}
                  language={currentArtifact.language}
                  type={currentArtifact.type}
                  compact={true}
                />
              )}
              {!isSharedConvo && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={handleShareArtifact}
                  disabled={shareArtifact.isLoading}
                  aria-label={localize('com_ui_share_artifact') || 'Share'}
                >
                  {isShared ? (
                    <Check size={16} className="text-green-500" aria-hidden="true" />
                  ) : (
                    <Share2 size={16} aria-hidden="true" />
                  )}
                </Button>
              )}
              <DownloadArtifact artifact={currentArtifact} />
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9"
                onClick={closeArtifacts}
                aria-label={localize('com_ui_close')}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-primary">
            <div className="absolute inset-0 flex flex-col">
              <ArtifactTabs
                artifact={currentArtifact}
                previewRef={previewRef as React.MutableRefObject<SandpackPreviewRef>}
                isSharedConvo={isSharedConvo}
              />
            </div>

            <div
              className={cn(
                'absolute inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out',
                isRefreshing ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
              )}
              aria-hidden={!isRefreshing}
              role="status"
            >
              <div
                className={cn(
                  'transition-transform duration-300 ease-in-out',
                  isRefreshing ? 'scale-100' : 'scale-95',
                )}
              >
                <Spinner size={24} />
              </div>
            </div>
          </div>

          {/* Sandbox error banner — "Try fix with Claude" */}
          {sandboxError && (
            <div className="flex items-center gap-2 border-t border-red-500/30 bg-red-500/10 px-4 py-2">
              <Bug className="h-4 w-4 flex-shrink-0 text-red-500" />
              <span className="flex-1 truncate text-xs text-red-600 dark:text-red-400">
                {sandboxError}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="flex items-center gap-1 border-red-500/30 text-xs text-red-600 hover:bg-red-500/10"
                onClick={handleTryFix}
              >
                <Wand2 className="h-3 w-3" />
                Try fix with Claude
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setSandboxError(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Link confirmation dialog */}
          {showLinkConfirm && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-sm rounded-xl border border-border-light bg-surface-primary p-5 shadow-2xl">
                <h3 className="mb-2 text-sm font-semibold text-text-primary">Open external link?</h3>
                <p className="mb-1 text-xs text-text-secondary">This artifact wants to open:</p>
                <p className="mb-4 break-all rounded bg-surface-secondary px-2 py-1 text-xs font-mono text-text-primary">
                  {showLinkConfirm}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLinkConfirm(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmLink}
                  >
                    Open link
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isMobile && (
            <div className="flex-shrink-0 border-t border-border-light bg-surface-primary-alt p-2">
              <Radio
                fullWidth
                options={tabOptions}
                value={activeTab}
                onChange={setActiveTab}
                disabled={isMutating && activeTab !== 'code'}
              />
            </div>
          )}
        </div>
      </div>
    </Tabs.Root>
  );
}
