import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button, Toast, ProgressBar, Tag } from "antd-mobile";
import { TeamOutline, LeftOutline } from "antd-mobile-icons";
import { AlertOutlined } from "@ant-design/icons";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon/index";
import style from "./index.module.scss";

interface GroupMember {
  id: string;
  nickname: string;
  wechatId: string;
  tags: string[];
}

interface Group {
  id: string;
  members: GroupMember[];
}

interface GroupTaskDetail {
  id: string;
  name: string;
  status: "preparing" | "creating" | "completed" | "paused";
  totalGroups: number;
  currentGroupIndex: number;
  groups: Group[];
  createTime: string;
  lastUpdateTime: string;
  creator: string;
  deviceCount: number;
  targetFriends: number;
  groupSize: { min: number; max: number };
  timeRange: { start: string; end: string };
  targetTags: string[];
  groupNameTemplate: string;
  groupDescription: string;
}

const mockTaskDetail: GroupTaskDetail = {
  id: "1",
  name: "VIP客户建群",
  status: "creating",
  totalGroups: 5,
  currentGroupIndex: 2,
  groups: Array.from({ length: 5 }).map((_, index) => ({
    id: `group-${index}`,
    members: Array.from({ length: Math.floor(Math.random() * 10) + 30 }).map(
      (_, mIndex) => ({
        id: `member-${index}-${mIndex}`,
        nickname: `用户${mIndex + 1}`,
        wechatId: `wx_${mIndex}`,
        tags: [`标签${(mIndex % 3) + 1}`],
      }),
    ),
  })),
  createTime: "2024-11-20 19:04:14",
  lastUpdateTime: "2025-02-06 13:12:35",
  creator: "admin",
  deviceCount: 2,
  targetFriends: 156,
  groupSize: { min: 20, max: 50 },
  timeRange: { start: "09:00", end: "21:00" },
  targetTags: ["VIP客户", "高价值"],
  groupNameTemplate: "VIP客户交流群{序号}",
  groupDescription: "VIP客户专属交流群，提供优质服务",
};

const GroupPreview: React.FC<{
  groupIndex: number;
  members: GroupMember[];
  isCreating: boolean;
  isCompleted: boolean;
  onRetry?: () => void;
}> = ({ groupIndex, members, isCreating, isCompleted, onRetry }) => {
  const [expanded, setExpanded] = useState(false);
  const targetSize = 38;
  return (
    <Card className={style.groupCard}>
      <div className={style.groupHeader}>
        <div>
          群 {groupIndex + 1}
          <Tag
            color={isCompleted ? "success" : isCreating ? "warning" : "default"}
            style={{ marginLeft: 8 }}
          >
            {isCompleted ? "已完成" : isCreating ? "创建中" : "等待中"}
          </Tag>
        </div>
        <div style={{ color: "#888", fontSize: 12 }}>
          <TeamOutline style={{ marginRight: 4 }} />
          {members.length}/{targetSize}
        </div>
      </div>
      {isCreating && !isCompleted && (
        <ProgressBar
          percent={Math.round((members.length / targetSize) * 100)}
          style={{ margin: "8px 0" }}
        />
      )}
      {expanded ? (
        <>
          <div className={style.memberGrid}>
            {members.map(member => (
              <div key={member.id} className={style.memberItem}>
                <span>{member.nickname}</span>
                {member.tags.length > 0 && (
                  <Tag color="primary" style={{ marginLeft: 4 }}>
                    {member.tags[0]}
                  </Tag>
                )}
              </div>
            ))}
          </div>
          <Button
            size="mini"
            fill="none"
            block
            onClick={() => setExpanded(false)}
            style={{ marginTop: 8 }}
          >
            收起
          </Button>
        </>
      ) : (
        <Button
          size="mini"
          fill="none"
          block
          onClick={() => setExpanded(true)}
          style={{ marginTop: 8 }}
        >
          查看成员 ({members.length})
        </Button>
      )}
      {!isCompleted && members.length < targetSize && (
        <div className={style.warnText}>
          <AlertOutlined style={{ marginRight: 4 }} />
          群人数不足{targetSize}人
          {onRetry && (
            <Button
              size="mini"
              fill="none"
              color="primary"
              style={{ marginLeft: 8 }}
              onClick={onRetry}
            >
              继续拉人
            </Button>
          )}
        </div>
      )}
      {isCompleted && <div className={style.successText}>群创建完成</div>}
    </Card>
  );
};

const GroupCreationProgress: React.FC<{
  taskDetail: GroupTaskDetail;
  onComplete: () => void;
}> = ({ taskDetail, onComplete }) => {
  const [groups, setGroups] = useState<Group[]>(taskDetail.groups);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(
    taskDetail.currentGroupIndex,
  );
  const [status, setStatus] = useState<GroupTaskDetail["status"]>(
    taskDetail.status,
  );

  useEffect(() => {
    if (status === "creating" && currentGroupIndex < groups.length) {
      const timer = setTimeout(() => {
        if (currentGroupIndex === groups.length - 1) {
          setStatus("completed");
          onComplete();
        } else {
          setCurrentGroupIndex(prev => prev + 1);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, currentGroupIndex, groups.length, onComplete]);

  const handleRetryGroup = (groupIndex: number) => {
    setGroups(prev =>
      prev.map((group, index) => {
        if (index === groupIndex) {
          return {
            ...group,
            members: [
              ...group.members,
              {
                id: `retry-member-${Date.now()}`,
                nickname: `补充用户${group.members.length + 1}`,
                wechatId: `wx_retry_${Date.now()}`,
                tags: ["新加入"],
              },
            ],
          };
        }
        return group;
      }),
    );
  };

  return (
    <div className={style.progressSection}>
      <Card className={style.progressCard}>
        <div className={style.progressHeader}>
          <div>
            建群进度
            <Tag
              color={
                status === "completed"
                  ? "success"
                  : status === "creating"
                    ? "warning"
                    : "default"
              }
              style={{ marginLeft: 8 }}
            >
              {status === "preparing"
                ? "准备中"
                : status === "creating"
                  ? "创建中"
                  : "已完成"}
            </Tag>
          </div>
          <div style={{ color: "#888", fontSize: 12 }}>
            {currentGroupIndex + 1}/{groups.length}组
          </div>
        </div>
        <ProgressBar
          percent={Math.round(((currentGroupIndex + 1) / groups.length) * 100)}
          style={{ marginTop: 8 }}
        />
      </Card>
      <div className={style.groupList}>
        {groups.map((group, index) => (
          <GroupPreview
            key={group.id}
            groupIndex={index}
            members={group.members}
            isCreating={status === "creating" && index === currentGroupIndex}
            isCompleted={status === "completed" || index < currentGroupIndex}
            onRetry={() => handleRetryGroup(index)}
          />
        ))}
      </div>
      {status === "completed" && (
        <div className={style.successAlert}>所有群组已创建完成</div>
      )}
    </div>
  );
};

const AutoGroupDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [taskDetail, setTaskDetail] = useState<GroupTaskDetail | null>(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setTaskDetail(mockTaskDetail);
      setLoading(false);
    }, 800);
  }, [id]);

  const handleComplete = () => {
    Toast.show({ content: "所有群组已创建完成" });
  };

  if (!taskDetail) {
    return (
      <Layout
        header={<NavCommon title="建群详情" backFn={() => navigate(-1)} />}
      >
        <Card className={style.emptyCard}>
          <AlertOutlined style={{ fontSize: 48, color: "#ccc" }} />
          <div className={style.emptyTitle}>任务不存在</div>
          <div className={style.emptyDesc}>请检查任务ID是否正确</div>
          <Button
            color="primary"
            onClick={() => navigate("/workspace/auto-group")}
          >
            返回列表
          </Button>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout
      header={
        <NavCommon
          title={taskDetail.name + " - 建群详情"}
          backFn={() => navigate(-1)}
        />
      }
      loading={loading}
    >
      <div className={style.autoGroupDetail}>
        <Card className={style.infoCard}>
          <div className={style.infoGrid}>
            <div>
              <div className={style.infoTitle}>基本信息</div>
              <div className={style.infoItem}>任务名称：{taskDetail.name}</div>
              <div className={style.infoItem}>
                创建时间：{taskDetail.createTime}
              </div>
              <div className={style.infoItem}>创建人：{taskDetail.creator}</div>
              <div className={style.infoItem}>
                执行设备：{taskDetail.deviceCount} 个
              </div>
            </div>
            <div>
              <div className={style.infoTitle}>建群配置</div>
              <div className={style.infoItem}>
                群组规模：{taskDetail.groupSize.min}-{taskDetail.groupSize.max}{" "}
                人
              </div>
              <div className={style.infoItem}>
                执行时间：{taskDetail.timeRange.start} -{" "}
                {taskDetail.timeRange.end}
              </div>
              <div className={style.infoItem}>
                目标标签：{taskDetail.targetTags.join(", ")}
              </div>
              <div className={style.infoItem}>
                群名称模板：{taskDetail.groupNameTemplate}
              </div>
            </div>
          </div>
        </Card>
        <GroupCreationProgress
          taskDetail={taskDetail}
          onComplete={handleComplete}
        />
      </div>
    </Layout>
  );
};

export default AutoGroupDetail;
