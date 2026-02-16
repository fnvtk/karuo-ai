import React from "react";
import { Card } from "antd-mobile";
import Layout from "@/components/Layout/Layout";
import style from "./index.module.scss";
import NavCommon from "@/components/NavCommon";

const Privacy: React.FC = () => {
  return (
    <Layout header={<NavCommon title="用户隐私协议" />}>
      <div className={style["setting-page"]}>
        <Card className={style["privacy-card"]}>
          <div className={style["privacy-content"]}>
            <h2>用户隐私协议</h2>
            <p className={style["update-time"]}>更新时间：2025年8月1日</p>

            <section>
              <h3>1. 信息收集</h3>
              <p>我们收集的信息包括：</p>
              <ul>
                <li>账户信息：用户名、手机号、邮箱等注册信息</li>
                <li>设备信息：设备型号、操作系统版本、设备标识符</li>
                <li>使用数据：应用使用情况、功能访问记录</li>
                <li>微信相关：微信账号信息、好友数据（经您授权）</li>
              </ul>
            </section>

            <section>
              <h3>2. 信息使用</h3>
              <p>我们使用收集的信息用于：</p>
              <ul>
                <li>提供和改进服务功能</li>
                <li>个性化用户体验</li>
                <li>安全防护和风险控制</li>
                <li>客户支持和问题解决</li>
                <li>合规性要求和法律义务</li>
              </ul>
            </section>

            <section>
              <h3>3. 信息共享</h3>
              <p>我们不会向第三方出售、交易或转让您的个人信息，除非：</p>
              <ul>
                <li>获得您的明确同意</li>
                <li>法律法规要求</li>
                <li>保护用户和公众的安全</li>
                <li>与授权合作伙伴共享必要信息</li>
              </ul>
            </section>

            <section>
              <h3>4. 数据安全</h3>
              <p>我们采取多种安全措施保护您的信息：</p>
              <ul>
                <li>数据加密传输和存储</li>
                <li>访问控制和身份验证</li>
                <li>定期安全审计和更新</li>
                <li>员工保密培训</li>
              </ul>
            </section>

            <section>
              <h3>5. 您的权利</h3>
              <p>您享有以下权利：</p>
              <ul>
                <li>访问和查看您的个人信息</li>
                <li>更正或更新不准确的信息</li>
                <li>删除您的账户和相关数据</li>
                <li>撤回同意和限制处理</li>
                <li>数据可携带性</li>
              </ul>
            </section>

            <section>
              <h3>6. 数据保留</h3>
              <p>我们仅在必要期间保留您的信息：</p>
              <ul>
                <li>账户活跃期间持续保留</li>
                <li>法律法规要求的保留期</li>
                <li>业务运营必要的保留期</li>
                <li>您主动删除后及时清除</li>
              </ul>
            </section>

            <section>
              <h3>7. 儿童隐私</h3>
              <p>
                我们的服务不面向13岁以下儿童。如果发现收集了儿童信息，我们将立即删除。
              </p>
            </section>

            <section>
              <h3>8. 国际传输</h3>
              <p>
                您的信息可能在中国境内或境外处理。我们将确保适当的保护措施。
              </p>
            </section>

            <section>
              <h3>9. 协议更新</h3>
              <p>
                我们可能会更新本隐私协议。重大变更将通过应用内通知或邮件告知您。
              </p>
            </section>

            <section>
              <h3>10. 联系我们</h3>
              <p>如果您对本隐私协议有任何疑问，请联系我们：</p>
              <ul>
                <li>邮箱：privacy@example.com</li>
                <li>电话：400-123-4567</li>
                <li>地址：北京市朝阳区xxx大厦</li>
              </ul>
            </section>

            <div className={style["privacy-footer"]}>
              <p>感谢您使用存客宝管理系统！</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Privacy;
