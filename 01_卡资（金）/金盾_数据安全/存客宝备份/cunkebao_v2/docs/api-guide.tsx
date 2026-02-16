import type { ReactNode } from "react"

interface ApiGuide {
  title: string
  description: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  parameters: {
    name: string
    type: string
    required: boolean
    description: string
  }[]
  requestExample: string
  responseExample: string
  notes?: string
}

interface ScenarioApiGuides {
  [key: string]: ApiGuide[]
}

// API指南数据
const apiGuides: ScenarioApiGuides = {
  phone: [
    {
      title: "获取电话获客列表",
      description: "获取所有电话获客场景的列表",
      endpoint: "/api/scenarios/phone",
      method: "GET",
      parameters: [
        {
          name: "page",
          type: "number",
          required: false,
          description: "页码，默认为1",
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "每页数量，默认为10",
        },
        {
          name: "status",
          type: "string",
          required: false,
          description: "状态筛选，可选值：active, inactive",
        },
      ],
      requestExample: `
GET /api/scenarios/phone?page=1&limit=10&status=active
      `,
      responseExample: `
{
  "success": true,
  "data": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "id": "phone-1",
        "name": "电话获客计划1",
        "status": "active",
        "createdAt": "2023-05-20T10:30:00Z",
        "deviceCount": 3,
        "acquisitionCount": 120
      },
      // ...更多数据
    ]
  }
}
      `,
    },
    {
      title: "创建电话获客场景",
      description: "创建新的电话获客场景",
      endpoint: "/api/scenarios/phone",
      method: "POST",
      parameters: [
        {
          name: "name",
          type: "string",
          required: true,
          description: "场景名称",
        },
        {
          name: "devices",
          type: "array",
          required: true,
          description: "设备ID数组",
        },
        {
          name: "tags",
          type: "array",
          required: false,
          description: "标签数组",
        },
        {
          name: "settings",
          type: "object",
          required: false,
          description: "场景设置",
        },
      ],
      requestExample: `
POST /api/scenarios/phone
Content-Type: application/json

{
  "name": "新电话获客计划",
  "devices": ["device-1", "device-2"],
  "tags": ["高意向", "新客户"],
  "settings": {
    "autoAdd": true,
    "speechToText": true,
    "callType": "both"
  }
}
      `,
      responseExample: `
{
  "success": true,
  "data": {
    "id": "phone-26",
    "name": "新电话获客计划",
    "status": "active",
    "createdAt": "2023-06-01T08:15:00Z"
  }
}
      `,
    },
  ],
  haibao: [
    {
      title: "获取海报获客列表",
      description: "获取所有海报获客场景的列表",
      endpoint: "/api/scenarios/haibao",
      method: "GET",
      parameters: [
        {
          name: "page",
          type: "number",
          required: false,
          description: "页码，默认为1",
        },
        {
          name: "limit",
          type: "number",
          required: false,
          description: "每页数量，默认为10",
        },
      ],
      requestExample: `
GET /api/scenarios/haibao?page=1&limit=10
      `,
      responseExample: `
{
  "success": true,
  "data": {
    "total": 15,
    "page": 1,
    "limit": 10,
    "items": [
      {
        "id": "haibao-1",
        "name": "618促销海报",
        "status": "active",
        "createdAt": "2023-05-15T09:20:00Z",
        "posterUrl": "https://example.com/posters/618.jpg",
        "scanCount": 230,
        "conversionCount": 45
      },
      // ...更多数据
    ]
  }
}
      `,
    },
  ],
  api: [
    {
      title: "API获客回调接口",
      description: "接收第三方系统推送的获客数据",
      endpoint: "/api/scenarios/api/callback",
      method: "POST",
      parameters: [
        {
          name: "token",
          type: "string",
          required: true,
          description: "API认证令牌",
        },
        {
          name: "data",
          type: "array",
          required: true,
          description: "获客数据数组",
        },
      ],
      requestExample: `
POST /api/scenarios/api/callback
Content-Type: application/json

{
  "token": "your_api_token",
  "data": [
    {
      "phone": "13800138000",
      "name": "张三",
      "source": "官网表单",
      "tags": ["高意向", "产品A"],
      "remark": "对产品A很感兴趣"
    },
    {
      "phone": "13900139000",
      "name": "李四",
      "source": "线下活动",
      "tags": ["中意向"],
      "remark": "参加了6月15日的产品发布会"
    }
  ]
}
      `,
      responseExample: `
{
  "success": true,
  "message": "数据接收成功",
  "data": {
    "received": 2,
    "processed": 2,
    "failed": 0
  }
}
      `,
      notes: "API令牌可在API获客场景详情页获取，请妥善保管",
    },
    {
      title: "获取API获客统计数据",
      description: "获取API获客场景的统计数据",
      endpoint: "/api/scenarios/api/{id}/stats",
      method: "GET",
      parameters: [
        {
          name: "id",
          type: "string",
          required: true,
          description: "API获客场景ID",
        },
        {
          name: "startDate",
          type: "string",
          required: false,
          description: "开始日期，格式：YYYY-MM-DD",
        },
        {
          name: "endDate",
          type: "string",
          required: false,
          description: "结束日期，格式：YYYY-MM-DD",
        },
      ],
      requestExample: `
GET /api/scenarios/api/api-1/stats?startDate=2023-05-01&endDate=2023-05-31
      `,
      responseExample: `
{
  "success": true,
  "data": {
    "total": 156,
    "daily": [
      {
        "date": "2023-05-01",
        "count": 12
      },
      {
        "date": "2023-05-02",
        "count": 8
      },
      // ...更多数据
    ],
    "sources": [
      {
        "name": "官网表单",
        "count": 78
      },
      {
        "name": "线下活动",
        "count": 45
      },
      {
        "name": "合作伙伴",
        "count": 33
      }
    ]
  }
}
      `,
    },
  ],
}

// 获取特定场景的API指南
export function getApiGuideForScenario(scenarioType: string): ApiGuide[] {
  return apiGuides[scenarioType] || []
}

// 渲染API指南组件
export function ApiGuideComponent({
  scenarioType,
  children,
}: {
  scenarioType: string
  children?: ReactNode
}): JSX.Element {
  const guides = getApiGuideForScenario(scenarioType)

  if (guides.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium">暂无API文档</h3>
        <p className="text-gray-500 mt-2">该场景类型暂未提供API接口文档</p>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {guides.map((guide, index) => (
        <div key={index} className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="text-lg font-medium">{guide.title}</h3>
            <p className="text-gray-500 mt-1">{guide.description}</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <h4 className="font-medium text-sm text-gray-500">接口地址</h4>
              <div className="flex items-center mt-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">{guide.method}</span>
                <span className="ml-2 font-mono">{guide.endpoint}</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm text-gray-500">参数说明</h4>
              <div className="mt-1 border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        参数名
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        类型
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        必填
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        说明
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {guide.parameters.map((param, paramIndex) => (
                      <tr key={paramIndex}>
                        <td className="px-4 py-2 text-sm font-mono">{param.name}</td>
                        <td className="px-4 py-2 text-sm">{param.type}</td>
                        <td className="px-4 py-2 text-sm">
                          {param.required ? (
                            <span className="text-red-500">是</span>
                          ) : (
                            <span className="text-gray-500">否</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">{param.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-500">请求示例</h4>
                <pre className="mt-1 p-3 bg-gray-800 text-gray-100 rounded-lg overflow-auto text-xs font-mono">
                  {guide.requestExample}
                </pre>
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-500">响应示例</h4>
                <pre className="mt-1 p-3 bg-gray-800 text-gray-100 rounded-lg overflow-auto text-xs font-mono">
                  {guide.responseExample}
                </pre>
              </div>
            </div>

            {guide.notes && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <h4 className="font-medium text-sm text-yellow-800">注意事项</h4>
                <p className="mt-1 text-sm text-yellow-700">{guide.notes}</p>
              </div>
            )}
          </div>
        </div>
      ))}
      {children}
    </div>
  )
}
