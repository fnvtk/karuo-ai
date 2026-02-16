"use client"

import { ContentSelector as CommonContentSelector } from "@/components/common/ContentSelector"
import type { ContentLibrary } from "@/components/common/ContentSelector"

interface ContentSelectorProps {
  selectedLibraries: ContentLibrary[]
  onLibrariesChange: (libraries: ContentLibrary[]) => void
  onPrevious: () => void
  onNext: () => void
  onSave: () => void
  onCancel: () => void
}

export function ContentSelector(props: ContentSelectorProps) {
  return <CommonContentSelector {...props} />
}
