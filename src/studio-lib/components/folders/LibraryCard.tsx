'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Library } from '@studio/lib/services/libraryService';
import libraryCardIcon from "@studio/assets/images/projectPreviewListLibraryIcon.svg";
import moreOptionsIcon from "@studio/assets/images/moreOptionsIcon.svg";
import tableThumbnail from "@studio/assets/images/tableThumbnail.svg";
import { ContextMenu, ContextMenuAction } from '@studio/components/layout/ContextMenu';
import styles from './LibraryCard.module.css';

type LibraryCardProps = {
  library: Library;
  projectId: string;
  assetCount?: number;
  userRole?: 'admin' | 'editor' | 'viewer' | null;
  isProjectOwner?: boolean;
  onClick?: (libraryId: string) => void;
  onAction?: (libraryId: string, action: ContextMenuAction) => void;
};

export function LibraryCard({ 
  library, 
  projectId,
  assetCount = 0,
  userRole,
  isProjectOwner,
  onClick,
  onAction,
}: LibraryCardProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleCardClick = () => {
    if (onClick && !contextMenu) {
      onClick(library.id);
    }
  };

  const handleMoreClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const buttonRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      x: buttonRect.left - 180,
      y: buttonRect.bottom + 4,
    });
  };

  const handleContextMenuAction = (action: ContextMenuAction) => {
    if (onAction) {
      onAction(library.id, action);
    }
    setContextMenu(null);
  };

  return (
    <>
      <div className={styles.card} onClick={handleCardClick}>
        <div className={styles.thumbnailContainer}>
          <Image 
            src={tableThumbnail} 
            alt="Table thumbnail" 
            width={573} 
            height={104}
            className={styles.thumbnail}
          />
        </div>
        <div className={styles.cardFooter}>
          <div className={styles.libraryInfo}>
            <div className={styles.libraryIconContainer}>
              <Image src={libraryCardIcon}
                alt="Library"
                width={24} height={24} className="icon-24"
              />
            </div>
            <div className={styles.libraryNameContainer}>
              <span className={styles.libraryName}>{library.name}</span>
              <span className={styles.assetCount}>{assetCount} assets</span>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className={`${styles.actionButton} ${contextMenu ? styles.actionButtonActive : ''}`}
              onClick={handleMoreClick}
              aria-label="More options"
            >
              <Image src={moreOptionsIcon}
                alt="More"
                width={20} height={20} className="icon-20"
              />
            </button>
          </div>
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type="library"
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
          userRole={userRole}
          isProjectOwner={isProjectOwner}
        />
      )}
    </>
  );
}

