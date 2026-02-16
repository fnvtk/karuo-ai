import React, { useEffect, useState } from "react";
import { NavBar } from "antd-mobile";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getSafeAreaHeight } from "@/utils/common";
interface NavCommonProps {
  title: string | React.ReactNode;
  backFn?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
}

const NavCommon: React.FC<NavCommonProps> = ({
  title,
  backFn,
  right,
  left,
}) => {
  const navigate = useNavigate();
  const [paddingTop, setPaddingTop] = useState("0px");
  useEffect(() => {
    setPaddingTop(getSafeAreaHeight() + "px");
  }, []);

  return (
    <div
      style={{
        paddingTop: paddingTop,
        background: "#fff",
      }}
    >
      <NavBar
        back={null}
        left={
          left ? (
            left
          ) : (
            <div className="nav-title">
              <ArrowLeftOutlined
                twoToneColor="#1677ff"
                onClick={() => {
                  if (backFn) {
                    backFn();
                  } else {
                    navigate(-1);
                  }
                }}
              />
            </div>
          )
        }
        right={right}
      >
        <span style={{ color: "var(--primary-color)", fontWeight: 600 }}>
          {title}
        </span>
      </NavBar>
    </div>
  );
};

export default NavCommon;
