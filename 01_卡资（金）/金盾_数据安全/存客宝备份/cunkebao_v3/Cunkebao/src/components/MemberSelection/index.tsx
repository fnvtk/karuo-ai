import React, { useState } from 'react';
import { Modal, Checkbox, Avatar, List, Button } from 'antd';

interface MemberSelectionProps {
  visible: boolean;
  members: { id: string; nickname: string; avatar: string }[];
  onCancel: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

const MemberSelection: React.FC<MemberSelectionProps> = ({ visible, members, onCancel, onConfirm }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleToggle = (id: string) => {
    const newSelectedIds = selectedIds.includes(id)
      ? selectedIds.filter(memberId => memberId !== id)
      : [...selectedIds, id];
    setSelectedIds(newSelectedIds);
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    setSelectedIds([]);
  };

  return (
    <Modal
      title="选择要删除的成员"
      visible={visible}
      onCancel={onCancel}
      onOk={handleConfirm}
      okText="删除"
      cancelText="取消"
    >
      <List
        dataSource={members}
        renderItem={member => (
          <List.Item key={member.id} onClick={() => handleToggle(member.id)} style={{ cursor: 'pointer' }}>
            <List.Item.Meta
              avatar={<Avatar src={member.avatar} />}
              title={member.nickname}
            />
            <Checkbox checked={selectedIds.includes(member.id)} />
          </List.Item>
        )}
      />
    </Modal>
  );
};

export default MemberSelection;