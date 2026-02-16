import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  content: string
  isUser: boolean
  timestamp: Date
  avatar?: string
}

export function ChatMessage({ content, isUser, timestamp, avatar }: ChatMessageProps) {
  return (
    <div className={cn("flex w-full gap-3 p-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <div className="bg-primary text-primary-foreground flex h-full w-full items-center justify-center rounded-full text-sm font-semibold">
            AI
          </div>
        </Avatar>
      )}

      <div className={cn("rounded-lg p-3 max-w-[80%]", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <p className="whitespace-pre-wrap">{content}</p>
        <div className={cn("text-xs mt-1", isUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {isUser && avatar && (
        <Avatar className="h-8 w-8">
          <img src={avatar || "/placeholder.svg"} alt="User" className="rounded-full" />
        </Avatar>
      )}
    </div>
  )
}
