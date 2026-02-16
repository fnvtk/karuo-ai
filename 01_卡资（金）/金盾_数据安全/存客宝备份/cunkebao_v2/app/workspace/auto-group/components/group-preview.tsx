"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, AlertCircle, CheckCircle2 } from "lucide-react"

interface Friend {
  id: string
  nickname: string
  wechatId: string
  tags: string[]
}

interface GroupPreviewProps {
  groupIndex: number
  members: Friend[]
  isCreating: boolean
  isCompleted: boolean
  onRetry?: () => void
}

export function GroupPreview({ groupIndex, members, isCreating, isCompleted, onRetry }: GroupPreviewProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            群 {groupIndex + 1}
            <Badge variant={isCompleted ? "success" : isCreating ? "default" : "secondary"} className="ml-2">
              {isCompleted ? "已完成" : isCreating ? "创建中" : "等待中"}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-500">{members.length}/38</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isCreating && !isCompleted && (
          <div className="mb-4">
            <Progress value={Math.round((members.length / 38) * 100)} />
          </div>
        )}

        {expanded ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {members.map((member) => (
                <div key={member.id} className="text-sm flex items-center space-x-2 bg-gray-50 p-2 rounded">
                  <span className="truncate">{member.nickname}</span>
                  {member.tags.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {member.tags[0]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setExpanded(false)}>
              收起
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded(true)}>
            查看成员 ({members.length})
          </Button>
        )}

        {!isCompleted && members.length < 38 && (
          <div className="mt-4 flex items-center text-amber-500 text-sm">
            <AlertCircle className="w-4 h-4 mr-2" />
            群人数不足38人
            {onRetry && (
              <Button variant="ghost" size="sm" className="ml-2 text-blue-500" onClick={onRetry}>
                继续拉人
              </Button>
            )}
          </div>
        )}

        {isCompleted && (
          <div className="mt-4 flex items-center text-green-500 text-sm">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            群创建完成
          </div>
        )}
      </CardContent>
    </Card>
  )
}
