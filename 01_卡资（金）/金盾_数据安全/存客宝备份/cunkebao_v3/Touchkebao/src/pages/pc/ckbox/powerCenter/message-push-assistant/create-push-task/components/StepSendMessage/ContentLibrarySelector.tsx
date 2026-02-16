import React from "react";
import ContentSelection from "@/components/ContentSelection";
import type { ContentItem } from "@/components/ContentSelection/data";
import styles from "./index.module.scss";

interface ContentLibrarySelectorProps {
  selectedContentLibraries: ContentItem[];
  onSelectedContentLibrariesChange: (selectedItems: ContentItem[]) => void;
}

const ContentLibrarySelector: React.FC<ContentLibrarySelectorProps> = ({
  selectedContentLibraries,
  onSelectedContentLibrariesChange,
}) => {
  return (
    <div className={styles.contentLibrarySelector}>
      <div className={styles.contentLibraryHeader}>
        <div className={styles.contentLibraryTitle}>内容库选择</div>
        <div className={styles.contentLibraryHint}>
          选择内容库可快速引用现有话术
        </div>
      </div>
      <ContentSelection
        selectedOptions={selectedContentLibraries}
        onSelect={onSelectedContentLibrariesChange}
        onConfirm={onSelectedContentLibrariesChange}
        placeholder="请选择内容库"
        selectedListMaxHeight={200}
      />
    </div>
  );
};

export default ContentLibrarySelector;
