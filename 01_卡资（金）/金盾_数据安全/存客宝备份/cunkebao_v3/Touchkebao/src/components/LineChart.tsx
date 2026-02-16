import React from "react";
import ReactECharts from "echarts-for-react";

interface LineChartProps {
  title?: string;
  xData: string[];
  yData: number[];
  height?: number | string;
}

const LineChart: React.FC<LineChartProps> = ({
  title = "",
  xData,
  yData,
  height = 200,
}) => {
  const option = {
    title: {
      text: title,
      left: "center",
      textStyle: { fontSize: 16 },
    },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: xData,
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
      boundaryGap: ["10%", "10%"], // 上下留白
      min: (value: any) => value.min - 10, // 下方多留一点空间
      max: (value: any) => value.max + 10, // 上方多留一点空间
      minInterval: 1,
      axisLabel: { margin: 12 },
    },
    series: [
      {
        data: yData,
        type: "line",
        smooth: true,
        symbol: "circle",
        lineStyle: { color: "#1677ff" },
        itemStyle: { color: "#1677ff" },
      },
    ],
    grid: { left: 40, right: 24, top: 40, bottom: 32 },
  };

  return <ReactECharts option={option} style={{ height, width: "100%" }} />;
};

export default LineChart;
