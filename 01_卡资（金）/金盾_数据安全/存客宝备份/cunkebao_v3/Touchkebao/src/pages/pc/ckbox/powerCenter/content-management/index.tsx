import React, { useRef } from "react";

import PowerNavigation from "@/components/PowerNavtion";
import MomentPublish from "./components/MomentPublish";
import PublishSchedule from "./components/PublishSchedule";
import styles from "./index.module.scss";

const ContentManagement: React.FC = () => {
  // 用于触发 PublishSchedule 刷新的引用
  const publishScheduleRef = useRef<{ refresh: () => void }>(null);

  // 发布成功后的回调函数
  const handlePublishSuccess = () => {
    // 触发 PublishSchedule 组件刷新
    if (publishScheduleRef.current) {
      publishScheduleRef.current.refresh();
    }
  };

  return (
    <div className={styles.container}>
      <PowerNavigation
        title="发朋友圈"
        subtitle="可以讲聊天过程的信息收录到素材库中,也调用。"
        showBackButton={true}
        backButtonText="返回功能中心"
        rightContent={<div className={styles.headerActions}></div>}
      />

      <div className={styles.content}>
        <div className={styles.mainLayout}>
          {/* 左侧：发布朋友圈 */}
          <div className={styles.leftSection}>
            <MomentPublish onPublishSuccess={handlePublishSuccess} />
          </div>

          {/* 右侧：发布计划 */}
          <div className={styles.rightSection}>
            <PublishSchedule ref={publishScheduleRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;
