export interface TutorialVideo {
  id: string
  title: string
  description: string
  url: string
  thumbnailUrl: string
}

export interface PageTutorial {
  pageId: string
  videos: TutorialVideo[]
}
