import React, { useState } from "react";
import { Avatar, Button, Image, Spin, Input, message } from "antd";
import {
  HeartOutlined,
  MessageOutlined,
  LoadingOutlined,
  SendOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  CommentItem,
  likeListItem,
  FriendCardProps,
  MomentListProps,
  FriendsCircleItem,
} from "@/pages/pc/ckbox/weChat/components/SidebarMenu/FriendsCicle/index.data";
import styles from "../index.module.scss";
import {
  likeMoment,
  cancelLikeMoment,
  commentMoment,
  cancelCommentMoment,
} from "./api";
import { comfirm } from "@/utils/common";

import { useWeChatStore } from "@/store/module/weChat/weChat";
// 单个朋友圈项目组件
export const FriendCard: React.FC<FriendCardProps> = ({
  monent,
  isNotMy = false,
  currentCustomer,
  wechatFriendId,
  formatTime,
}) => {
  const content = monent?.momentEntity?.content || "";
  const images = monent?.momentEntity?.resUrls || [];
  const time = formatTime(monent.createTime);
  const likesCount = monent?.likeList?.length || 0;
  const commentsCount = monent?.commentList?.length || 0;
  const { updateLikeMoment, updateComment } = useWeChatStore();

  // 评论相关状态
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleLike = (moment: FriendsCircleItem) => {
    console.log(currentCustomer);

    //判断是否已经点赞了
    const isLiked = moment?.likeList?.some(
      (item: likeListItem) => item.wechatId === currentCustomer?.wechatId,
    );
    if (isLiked) {
      cancelLikeMoment({
        wechatAccountId: currentCustomer?.id || 0,
        wechatFriendId: wechatFriendId || 0,
        snsId: moment.snsId,
        seq: Date.now(),
      });
      // 更新点赞
      updateLikeMoment(
        moment.snsId,
        moment.likeList.filter(v => v.wechatId !== currentCustomer?.wechatId),
      );
    } else {
      likeMoment({
        wechatAccountId: currentCustomer?.id || 0,
        wechatFriendId: wechatFriendId || 0,
        snsId: moment.snsId,
        seq: Date.now(),
      });
      // 更新点赞
      updateLikeMoment(moment.snsId, [
        ...moment.likeList,
        {
          createTime: Date.now(),
          nickName: currentCustomer?.nickname || "",
          wechatId: currentCustomer?.wechatId || "",
        },
      ]);
    }
  };

  const handleSendComment = monent => {
    if (!commentText.trim()) {
      message.warning("请输入评论内容");
      return;
    }

    // TODO: 调用发送评论的API
    commentMoment({
      wechatAccountId: currentCustomer?.id || 0,
      wechatFriendId: wechatFriendId || 0,
      snsId: monent.snsId,
      sendWord: commentText,
      seq: Date.now(),
    });
    // 更新评论
    updateComment(monent.snsId, [
      ...monent.commentList,
      {
        commentArg: 0,
        commentId1: Date.now(),
        commentId2: Date.now(),
        commentTime: Date.now(),
        content: commentText,
        nickName: currentCustomer?.nickname || "",
        wechatId: currentCustomer?.wechatId || "",
      },
    ]);
    // 清空输入框并隐藏
    setCommentText("");
    setShowCommentInput(false);
    message.success("评论发送成功");
  };

  const handleDeleteComment = (snsId: string, comment: CommentItem) => {
    // TODO: 调用删除评论的API
    comfirm("确定删除评论吗？").then(() => {
      cancelCommentMoment({
        wechatAccountId: currentCustomer?.id || 0,
        wechatFriendId: wechatFriendId || 0,
        snsId: snsId,
        seq: Date.now(),
        commentId2: comment.commentId2,
        commentTime: comment.commentTime,
      });
      // 更新评论
      const commentList = monent.commentList.filter(v => {
        return !(
          v.commentId2 == comment.commentId2 &&
          v.wechatId == currentCustomer?.wechatId
        );
      });
      updateComment(snsId, commentList);
      message.success("评论删除成功");
    });
  };

  return (
    <div className={styles.circleItem}>
      {isNotMy && (
        <div className={styles.avatar}>
          <Avatar size={36} shape="square" src="/public/assets/face/1.png" />
        </div>
      )}
      <div className={styles.itemWrap}>
        <div className={styles.itemHeader}>
          <div className={styles.userInfo}>
            {/* <div className={styles.username}>{nickName}</div> */}
          </div>
        </div>

        <div className={styles.itemContent}>
          <div className={styles.contentText}>{content}</div>
          {images && images.length > 0 && (
            <div className={styles.imageContainer}>
              {images.map((image, index) => (
                <Image
                  key={index}
                  src={image}
                  className={styles.contentImage}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.itemFooter}>
          <div className={styles.timeInfo}>{time}</div>
          <div className={styles.actions}>
            <Button
              type="text"
              size="small"
              icon={<HeartOutlined />}
              onClick={() => handleLike(monent)}
              className={styles.actionButton}
            >
              {likesCount > 0 && <span>{likesCount}</span>}
            </Button>
            <Button
              type="text"
              size="small"
              icon={<MessageOutlined />}
              onClick={() => setShowCommentInput(!showCommentInput)}
              className={styles.actionButton}
            >
              {commentsCount > 0 && <span>{commentsCount}</span>}
            </Button>
          </div>
        </div>

        {/* 点赞和评论区域 */}
        {(monent?.likeList?.length > 0 || monent?.commentList?.length > 0) && (
          <div className={styles.interactionArea}>
            {/* 点赞列表 */}
            {monent?.likeList?.length > 0 && (
              <div className={styles.likeArea}>
                <HeartOutlined className={styles.likeIcon} />
                <span className={styles.likeList}>
                  {monent?.likeList?.map((like, index) => (
                    <span key={`${like.wechatId}-${like.createTime}-${index}`}>
                      {like.nickName}
                      {index < (monent?.likeList?.length || 0) - 1 && "、"}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* 评论列表 */}
            {monent?.commentList?.length > 0 && (
              <div className={styles.commentArea}>
                {monent?.commentList?.map(comment => (
                  <div
                    key={`${comment.wechatId}-${comment.commentTime}`}
                    className={styles.commentItem}
                  >
                    <span className={styles.commentUser}>
                      {comment.nickName}
                    </span>
                    <span className={styles.commentSeparator}>: </span>
                    <span className={styles.commentContent}>
                      {comment.content}
                    </span>
                    <Button
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteComment(monent.snsId, comment)}
                      className={styles.deleteCommentBtn}
                      danger
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 评论输入框 */}
        {showCommentInput && (
          <div className={styles.commentInputArea}>
            <Input.TextArea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="写评论..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              className={styles.commentInput}
            />
            <div className={styles.commentInputActions}>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={() => handleSendComment(monent)}
                className={styles.sendCommentBtn}
              >
                发送
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 朋友圈列表组件
export const MomentList: React.FC<MomentListProps> = ({
  MomentCommon,
  MomentCommonLoading,
  formatTime,
  currentCustomer,
  loadMomentData,
}) => {
  return (
    <div className={styles.myCircleContent}>
      {MomentCommon.length > 0 ? (
        <>
          {MomentCommon.map((v, index) => (
            <div
              key={`${v.snsId}-${v.createTime}-${index}`}
              className={styles.itemWrapper}
            >
              <FriendCard
                monent={v}
                isNotMy={false}
                formatTime={formatTime}
                currentCustomer={currentCustomer}
              />
            </div>
          ))}
          {MomentCommonLoading && (
            <div className={styles.loadingMore}>
              <Spin indicator={<LoadingOutlined spin />} /> 加载中...
            </div>
          )}
          {!MomentCommonLoading && (
            <div style={{ textAlign: "center" }}>
              <Button
                size="small"
                type="primary"
                onClick={() => loadMomentData(true)}
              >
                加载更多...
              </Button>
            </div>
          )}
        </>
      ) : MomentCommonLoading ? (
        <div className={styles.loadingMore}>
          <Spin indicator={<LoadingOutlined spin />} /> 加载中...
        </div>
      ) : (
        <p className={styles.emptyText}>暂无我的朋友圈内容</p>
      )}
    </div>
  );
};
