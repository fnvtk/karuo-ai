"use client"

import { useState } from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface MobileAccount {
  id: string
  name: string
  phone: string
  createdAt: string
  status: "active" | "inactive"
}

export default function MobileAccountsPage() {
  const [accounts, setAccounts] = useState<MobileAccount[]>([
    {
      id: "1",
      name: "用户1",
      phone: "13809076043",
      createdAt: "2023-01-15",
      status: "active",
    },
    {
      id: "2",
      name: "用户2",
      phone: "13819176143",
      createdAt: "2023-02-15",
      status: "inactive",
    },
    {
      id: "3",
      name: "用户3",
      phone: "13829276243",
      createdAt: "2023-03-15",
      status: "active",
    },
    {
      id: "4",
      name: "用户4",
      phone: "13839376343",
      createdAt: "2023-04-15",
      status: "inactive",
    },
    {
      id: "5",
      name: "用户5",
      phone: "13849476443",
      createdAt: "2023-05-15",
      status: "active",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAccount, setNewAccount] = useState({
    name: "",
    password: "",
    phone: "",
    role: "",
    permissions: {
      notifications: false,
      dataView: false,
      remoteControl: false,
    },
  })

  const handleCreateAccount = () => {
    // 这里应该有API调用来创建账号
    const newId = (accounts.length + 1).toString()
    setAccounts([
      ...accounts,
      {
        id: newId,
        name: newAccount.name,
        phone: newAccount.phone,
        createdAt: new Date().toISOString().split("T")[0],
        status: "active",
      },
    ])
    setIsDialogOpen(false)
    setNewAccount({
      name: "",
      password: "",
      phone: "",
      role: "",
      permissions: {
        notifications: false,
        dataView: false,
        remoteControl: false,
      },
    })
  }

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter((account) => account.id !== id))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">手机端账号列表</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增手机端账号
        </Button>
      </div>

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>账号名称</TableHead>
              <TableHead>手机号码</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell>
                <TableCell>{account.phone}</TableCell>
                <TableCell>{account.createdAt}</TableCell>
                <TableCell>
                  <Badge variant={account.status === "active" ? "success" : "secondary"}>
                    {account.status === "active" ? "活跃" : "非活跃"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteAccount(account.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增手机端账号</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">账号名称</Label>
              <Input
                id="name"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                placeholder="请输入账号名称"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">初始密码</Label>
              <Input
                id="password"
                type="password"
                value={newAccount.password}
                onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                placeholder="请输入初始密码"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">手机号码</Label>
              <Input
                id="phone"
                value={newAccount.phone}
                onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                placeholder="请输入手机号码"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">角色</Label>
              <Select value={newAccount.role} onValueChange={(value) => setNewAccount({ ...newAccount, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="user">普通用���</SelectItem>
                  <SelectItem value="guest">访客</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>功能权限</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifications"
                    checked={newAccount.permissions.notifications}
                    onCheckedChange={(checked) =>
                      setNewAccount({
                        ...newAccount,
                        permissions: { ...newAccount.permissions, notifications: !!checked },
                      })
                    }
                  />
                  <Label htmlFor="notifications">消息通知</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="dataView"
                    checked={newAccount.permissions.dataView}
                    onCheckedChange={(checked) =>
                      setNewAccount({
                        ...newAccount,
                        permissions: { ...newAccount.permissions, dataView: !!checked },
                      })
                    }
                  />
                  <Label htmlFor="dataView">数据查看</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remoteControl"
                    checked={newAccount.permissions.remoteControl}
                    onCheckedChange={(checked) =>
                      setNewAccount({
                        ...newAccount,
                        permissions: { ...newAccount.permissions, remoteControl: !!checked },
                      })
                    }
                  />
                  <Label htmlFor="remoteControl">远程控制</Label>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateAccount}>创建账号</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
