"use client"

import { useState } from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface OperatorAccount {
  id: string
  phone: string
  nickname: string
  deviceCount: number
  friendCount: number
  createdAt: string
  status: "active" | "inactive"
}

export default function OperatorAccountsPage() {
  const [accounts, setAccounts] = useState<OperatorAccount[]>([
    {
      id: "1",
      phone: "13809076043",
      nickname: "操盘手1",
      deviceCount: 1,
      friendCount: 25,
      createdAt: "2023-01-15",
      status: "active",
    },
    {
      id: "2",
      phone: "13819176143",
      nickname: "操盘手2",
      deviceCount: 2,
      friendCount: 50,
      createdAt: "2023-02-15",
      status: "inactive",
    },
    {
      id: "3",
      phone: "13829276243",
      nickname: "操盘手3",
      deviceCount: 3,
      friendCount: 75,
      createdAt: "2023-03-15",
      status: "active",
    },
    {
      id: "4",
      phone: "13839376343",
      nickname: "操盘手4",
      deviceCount: 4,
      friendCount: 100,
      createdAt: "2023-04-15",
      status: "inactive",
    },
    {
      id: "5",
      phone: "13849476443",
      nickname: "操盘手5",
      deviceCount: 5,
      friendCount: 125,
      createdAt: "2023-05-15",
      status: "active",
    },
  ])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newAccount, setNewAccount] = useState({
    phone: "",
    nickname: "",
    password: "",
  })

  const handleCreateAccount = () => {
    // 这里应该有API调用来创建账号
    const newId = (accounts.length + 1).toString()
    setAccounts([
      ...accounts,
      {
        id: newId,
        phone: newAccount.phone,
        nickname: newAccount.nickname,
        deviceCount: 0,
        friendCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
        status: "active",
      },
    ])
    setIsDialogOpen(false)
    setNewAccount({
      phone: "",
      nickname: "",
      password: "",
    })
  }

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter((account) => account.id !== id))
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">操盘手账号列表</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新增操盘手账号
        </Button>
      </div>

      <div className="bg-white rounded-md shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>登录手机号</TableHead>
              <TableHead>备注 (昵称)</TableHead>
              <TableHead>关联设备数量</TableHead>
              <TableHead>微信好友数量</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.phone}</TableCell>
                <TableCell>{account.nickname}</TableCell>
                <TableCell>{account.deviceCount}</TableCell>
                <TableCell>{account.friendCount}</TableCell>
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
            <DialogTitle>新增操盘手账号</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">登录手机号</Label>
              <Input
                id="phone"
                value={newAccount.phone}
                onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                placeholder="请输入手机号"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nickname">备注 (昵称)</Label>
              <Input
                id="nickname"
                value={newAccount.nickname}
                onChange={(e) => setNewAccount({ ...newAccount, nickname: e.target.value })}
                placeholder="请输入昵称"
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
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateAccount}>创建账号</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
