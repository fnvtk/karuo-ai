import React, { useState } from "react";
import { Button } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import NavCommon from "@/components/NavCommon";
import BasicInfo from "./components/BasicInfo";
import AudienceFilter from "./components/AudienceFilter";
import UserListPreview from "./components/UserListPreview";
import styles from "./index.module.scss";
import StepIndicator from "@/components/StepIndicator";

const CreateTrafficPackage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1); // 1 基础信息 2 人群筛选 3 用户列表
  const [submitting, setSubmitting] = useState(false); // 添加提交状态
  const [formData, setFormData] = useState({
    // 基本信息
    name: "",
    description: "",
    remarks: "",
    // 筛选条件
    filterConditions: [],
    // 用户列表
    filteredUsers: [],
  });

  const steps = [
    { id: 1, title: "basic", subtitle: "基本信息" },
    { id: 2, title: "filter", subtitle: "人群筛选" },
    { id: 3, title: "users", subtitle: "预览" },
  ];

  const handleBasicInfoChange = (data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleFilterChange = (conditions: any[]) => {
    setFormData(prev => ({ ...prev, filterConditions: conditions }));
  };

  const handleGenerateUsers = (users: any[]) => {
    setFormData(prev => ({ ...prev, filteredUsers: users }));
  };

  // 初始化模拟数据
  React.useEffect(() => {
    if (currentStep === 3 && formData.filteredUsers.length === 0) {
      const mockUsers = [
        {
          id: "U00000001",
          name: "张三",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=1",
          tags: ["高价值用户", "活跃用户"],
          rfmScore: 12,
          lastActive: "7天内",
          consumption: 2500,
        },
        {
          id: "U00000002",
          name: "李四",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=2",
          tags: ["新用户", "价格敏感"],
          rfmScore: 6,
          lastActive: "3天内",
          consumption: 800,
        },
        {
          id: "U00000003",
          name: "王五",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=3",
          tags: ["复购率高", "高潜力"],
          rfmScore: 14,
          lastActive: "1天内",
          consumption: 3200,
        },
        {
          id: "U00000004",
          name: "赵六",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=4",
          tags: ["已沉睡", "流失风险"],
          rfmScore: 3,
          lastActive: "30天内",
          consumption: 200,
        },
        {
          id: "U00000005",
          name: "钱七",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=5",
          tags: ["高价值用户", "复购率高"],
          rfmScore: 15,
          lastActive: "2天内",
          consumption: 4500,
        },
      ];
      setFormData(prev => ({ ...prev, filteredUsers: mockUsers }));
    }
  }, [currentStep, formData.filteredUsers.length]);

  const handleSubmit = async () => {
    // 防止重复提交
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      // 提交逻辑
      console.log("提交数据:", formData);
      // 这里可以调用实际的 API
      // await createTrafficPackage(formData);

      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 提交成功后可以跳转或显示成功消息
      console.log("流量包创建成功");
    } catch (error) {
      console.error("创建流量包失败:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = formData.name && formData.filterConditions.length > 0;

  // 模拟生成用户数据
  const generateMockUsers = (conditions: any[]) => {
    const mockUsers = [];
    const userCount = Math.floor(Math.random() * 1000) + 100; // 100-1100个用户

    for (let i = 1; i <= userCount; i++) {
      mockUsers.push({
        id: `U${String(i).padStart(8, "0")}`,
        name: `用户${i}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        tags: ["高价值用户", "活跃用户"],
        rfmScore: Math.floor(Math.random() * 15) + 1,
        lastActive: "7天内",
        consumption: Math.floor(Math.random() * 5000) + 100,
      });
    }

    return mockUsers;
  };

  const renderFooter = () => {
    return (
      <div className={styles.footer}>
        <div className={styles.buttonGroup}>
          {currentStep > 1 && (
            <Button
              className={styles.prevButton}
              onClick={() => setCurrentStep(s => Math.max(1, s - 1))}
              disabled={submitting}
            >
              上一步
            </Button>
          )}
          {currentStep < 3 ? (
            <Button
              color="primary"
              className={styles.nextButton}
              onClick={() => {
                if (currentStep === 2) {
                  // 在第二步时生成用户列表
                  const mockUsers = generateMockUsers(
                    formData.filterConditions,
                  );
                  handleGenerateUsers(mockUsers);
                }
                setCurrentStep(s => Math.min(3, s + 1));
              }}
              disabled={submitting}
            >
              下一步
            </Button>
          ) : (
            <Button
              color="primary"
              className={styles.submitButton}
              disabled={!canSubmit || submitting}
              loading={submitting}
              onClick={handleSubmit}
            >
              {submitting ? "创建中..." : "创建流量包"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout
      header={
        <>
          <NavCommon title="新建流量包" />
          <StepIndicator currentStep={currentStep} steps={steps} />
        </>
      }
      footer={renderFooter()}
    >
      <div className={styles.content}>
        {currentStep === 1 && (
          <BasicInfo data={formData} onChange={handleBasicInfoChange} />
        )}

        {currentStep === 2 && (
          <AudienceFilter
            conditions={formData.filterConditions}
            onChange={handleFilterChange}
          />
        )}

        {currentStep === 3 && (
          <UserListPreview
            users={formData.filteredUsers}
            onRemoveUser={userId => {
              setFormData(prev => ({
                ...prev,
                filteredUsers: prev.filteredUsers.filter(
                  (user: any) => user.id !== userId,
                ),
              }));
            }}
          />
        )}
      </div>
    </Layout>
  );
};

export default CreateTrafficPackage;
