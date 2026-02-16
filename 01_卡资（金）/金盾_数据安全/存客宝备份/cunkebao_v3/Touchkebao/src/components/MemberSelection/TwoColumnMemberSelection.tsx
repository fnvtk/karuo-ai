import React, { useState } from 'react';
import { Modal, Input, Avatar, Button, Checkbox } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styles from './TwoColumnMemberSelection.module.scss';

interface Member {
  id: string;
  nickname: string;
  avatar: string;
}

interface TwoColumnMemberSelectionProps {
  visible: boolean;
  members: Member[];
  onCancel: () => void;
  onConfirm: (selectedIds: string[]) => void;
  title?: string;
  allowMultiple?: boolean;
}

const TwoColumnMemberSelection: React.FC<TwoColumnMemberSelectionProps> = ({
  visible,
  members,
  onCancel,
  onConfirm,
  title = '选择成员',
  allowMultiple = true,
}) => {
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤成员
  const filteredMembers = members.filter(member =>
    member.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // 选择成员
  const handleSelectMember = (member: Member) => {
    const isSelected = selectedMembers.some(m => m.id === member.id);
    
    if (allowMultiple) {
      if (isSelected) {
        setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
      } else {
        setSelectedMembers([...selectedMembers, member]);
      }
    } else {
      // 单选模式
      if (isSelected) {
        setSelectedMembers([]);
      } else {
        setSelectedMembers([member]);
      }
    }
  };

  // 移除已选成员
  const handleRemoveMember = (memberId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== memberId));
  };

  // 确认选择
  const handleConfirmSelection = () => {
    const selectedIds = selectedMembers.map(m => m.id);
    onConfirm(selectedIds);
    setSelectedMembers([]);
    setSearchQuery('');
  };

  // 取消选择
  const handleCancelSelection = () => {
    setSelectedMembers([]);
    setSearchQuery('');
    onCancel();
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancelSelection}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancelSelection}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirmSelection}
          disabled={selectedMembers.length === 0}
        >
          确定
        </Button>,
      ]}
      className={styles.twoColumnModal}
    >
      <div className={styles.container}>
        {/* 左侧：成员列表 */}
        <div className={styles.leftColumn}>
          <div className={styles.searchWrapper}>
            <Input
              placeholder="请输入昵称或微信号"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              prefix={<SearchOutlined />}
              allowClear
            />
          </div>
          
          <div className={styles.memberList}>
            {filteredMembers.length > 0 ? (
              filteredMembers.map(member => {
                const isSelected = selectedMembers.some(m => m.id === member.id);
                return (
                  <div
                    key={member.id}
                    className={`${styles.memberItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleSelectMember(member)}
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar src={member.avatar} size={40}>
                      {member.nickname?.charAt(0)}
                    </Avatar>
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{member.nickname}</div>
                      <div className={styles.memberId}>{member.id}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.empty}>
                {searchQuery ? `没有找到包含"${searchQuery}"的成员` : '暂无成员'}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：已选成员 */}
        <div className={styles.rightColumn}>
          <div className={styles.selectedHeader}>
            已选成员 ({selectedMembers.length})
            {!allowMultiple && <span className={styles.singleTip}>（单选）</span>}
          </div>
          
          <div className={styles.selectedList}>
            {selectedMembers.length > 0 ? (
              selectedMembers.map(member => (
                <div key={member.id} className={styles.selectedItem}>
                  <Avatar src={member.avatar} size={32}>
                    {member.nickname?.charAt(0)}
                  </Avatar>
                  <div className={styles.selectedInfo}>
                    <div className={styles.selectedName}>{member.nickname}</div>
                  </div>
                  <Button
                    type="text"
                    size="small"
                    onClick={() => handleRemoveMember(member.id)}
                    className={styles.removeBtn}
                  >
                    ×
                  </Button>
                </div>
              ))
            ) : (
              <div className={styles.emptySelected}>
                暂无选择
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TwoColumnMemberSelection;