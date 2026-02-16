export interface ContentLibrary {
  id: string
  name: string
  type: "moments" | "group"
  source: string
  creator: string
  contentCount: number
  lastUpdated: string
  status: "active" | "inactive"
}

export interface ContentLibraryResponse {
  code: number
  message: string
  data: {
    libraries: ContentLibrary[]
    total: number
  }
}

export interface ContentLibrarySelectResponse {
  code: number
  message: string
  data: {
    success: boolean
    libraryId: string
    name: string
  }
}
