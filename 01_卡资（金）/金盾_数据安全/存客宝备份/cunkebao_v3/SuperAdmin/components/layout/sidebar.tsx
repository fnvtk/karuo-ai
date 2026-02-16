"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import * as LucideIcons from "lucide-react"
import { cn } from "@/lib/utils"
import { useTabContext } from "@/app/dashboard/layout"
import { getMenus } from "@/lib/menu-api"

// 适配后端返回的菜单项格式
interface MenuItem {
  id: number
  parentId?: number | null
  parent_id?: number // 后端返回的字段
  name?: string
  title?: string // 后端返回的字段
  path: string
  icon?: string
  order?: number
  sort?: number // 后端返回的字段
  status?: number
  children?: MenuItem[]
}

export function Sidebar() {
  const pathname = usePathname()
  const [menus, setMenus] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set())
  const [collapsed, setCollapsed] = useState(false) // 添加折叠状态
  const { addTab } = useTabContext()

  // 字段适配：将后端返回的菜单数据格式转换为前端需要的格式
  const adaptMenuItem = (item: MenuItem): MenuItem => {
    return {
      id: item.id,
      parentId: item.parent_id || null,
      name: item.title || item.name,
      path: item.path,
      icon: item.icon,
      order: item.sort || item.order || 0,
      children: item.children ? item.children.map(adaptMenuItem) : []
    };
  };

  // 切换折叠状态
  const toggleCollapsed = () => {
    setCollapsed(prev => !prev);
  };

  // 获取菜单数据
  useEffect(() => {
    const fetchMenus = async () => {
      setLoading(true)
      
      try {
        // 从后端API获取菜单数据
        const menuData = await getMenus(true);
        
        // 适配数据格式
        const adaptedMenus = menuData.map(adaptMenuItem);
        
        // 构建菜单树
        const menuTree = buildMenuTree(adaptedMenus);
        setMenus(menuTree);
        
        // 初始自动展开当前活动菜单的父菜单
        autoExpandActiveMenuParent(adaptedMenus);
      } catch (error) {
        console.error("获取菜单数据失败:", error);
        // 获取失败时使用空菜单
        setMenus([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenus();
  }, []); // 仅在组件挂载时执行一次，移除pathname依赖
  
  // 监听路径变化以更新菜单展开状态
  useEffect(() => {
    if (menus.length > 0) {
      // 只在菜单数据存在且路径变化时更新展开状态
      // 获取当前路径所需展开的所有父菜单ID
      const pathMenuItems = menus.reduce((allItems, item) => {
        const flattenMenu = (menuItem: MenuItem, items: MenuItem[] = []) => {
          items.push(menuItem);
          if (menuItem.children && menuItem.children.length > 0) {
            menuItem.children.forEach(child => flattenMenu(child, items));
          }
          return items;
        };
        return [...allItems, ...flattenMenu(item)];
      }, [] as MenuItem[]);
      
      // 保存当前展开状态
      setExpandedMenus(prev => {
        // 创建新集合，保留所有已展开的菜单
        const newExpanded = new Set(prev);
        
        // 将需要展开的菜单添加到集合中
        const currentPath = pathname === "/" ? "/dashboard" : pathname;
        
        // 查找当前路径对应的菜单项和所有父菜单
        const findActiveMenuParents = (items: MenuItem[], parentIds: number[] = []): number[] => {
          for (const item of items) {
            // 如果是"#"路径的菜单，检查其子菜单
            if (item.path === "#" && item.children && item.children.length > 0) {
              const found = findActiveMenuParents(item.children, [...parentIds, item.id]);
              if (found.length > 0) {
                return [...found, item.id];
              }
            } 
            // 检查菜单路径是否匹配当前路径
            else if (currentPath === item.path || currentPath.startsWith(item.path + "/")) {
              return [...parentIds];
            }
            
            // 递归检查子菜单
            if (item.children && item.children.length > 0) {
              const found = findActiveMenuParents(item.children, [...parentIds, item.id]);
              if (found.length > 0) {
                return found;
              }
            }
          }
          return [];
        };
        
        // 获取需要自动展开的菜单ID
        const parentsToExpand = findActiveMenuParents(menus);
        
        // 添加到展开集合中
        parentsToExpand.forEach(id => newExpanded.add(id));
        
        return newExpanded;
      });
    }
  }, [pathname, menus]);

  // 构建菜单树结构
  const buildMenuTree = (items: MenuItem[]) => {
    const map = new Map<number, MenuItem>();
    const roots: MenuItem[] = [];
    
    // 先创建所有菜单项的映射
    items.forEach(item => {
      map.set(item.id, { ...item, children: item.children || [] });
    });
    
    // 构建树结构
    items.forEach(item => {
      if (!item.parentId || item.parentId === 0) {
        // 根菜单
        roots.push(map.get(item.id)!);
      } else {
        // 子菜单
        const parent = map.get(item.parentId);
        if (parent && parent.children) {
          parent.children.push(map.get(item.id)!);
        }
      }
    });
    
    // 排序
    roots.sort((a, b) => (a.order || 0) - (b.order || 0));
    roots.forEach(root => {
      if (root.children) {
        root.children.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    });
    
    return roots;
  };

  // 自动展开当前活动菜单的父菜单
  const autoExpandActiveMenuParent = (menuItems: MenuItem[]) => {
    const newExpandedMenus = new Set<number>();
    
    // 递归查找当前路径匹配的菜单项
    const findActiveMenu = (items: MenuItem[], parentIds: number[] = []) => {
      for (const item of items) {
        // 如果是"#"路径的菜单，跳过路径检查
        if (item.path === "#") {
          if (item.children && item.children.length > 0) {
            const found = findActiveMenu(item.children, [...parentIds, item.id]);
            if (found) {
              // 将所有父菜单ID添加到展开集合
              parentIds.forEach(id => newExpandedMenus.add(id));
              newExpandedMenus.add(item.id); // 确保当前菜单也被展开
              return true;
            }
          }
          continue;
        }
        
        const currentPath = pathname === "/" ? "/dashboard" : pathname;
        
        if (currentPath === item.path || currentPath.startsWith(item.path + "/")) {
          // 将所有父菜单ID添加到展开集合
          parentIds.forEach(id => newExpandedMenus.add(id));
          return true;
        }
        
        if (item.children && item.children.length > 0) {
          const found = findActiveMenu(item.children, [...parentIds, item.id]);
          if (found) {
            return true;
          }
        }
      }
      return false;
    };
    
    findActiveMenu(menuItems);
    
    // 将新的展开菜单集合设置到状态
    setExpandedMenus(newExpandedMenus);
  };

  // 切换菜单展开状态
  const toggleMenu = (menuId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setExpandedMenus(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(menuId)) {
        newExpanded.delete(menuId);
      } else {
        newExpanded.add(menuId);
      }
      return newExpanded;
    });
  };

  // 获取Lucide图标组件
  const getLucideIcon = (iconName: string) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4 mr-2" /> : null;
  };

  // 渲染菜单项
  const renderMenuItem = (item: MenuItem) => {
    // 修改子菜单项活动状态判断逻辑
    const isMenuPathActive = (menuPath: string, currentPath: string) => {
      // 对于精确匹配的情况，直接返回true
      if (currentPath === menuPath) {
        return true;
      }
      
      // 特殊处理项目列表路径
      if (menuPath === "/dashboard/projects" && currentPath !== "/dashboard/projects") {
        // 如果当前路径不是精确匹配项目列表，则项目列表不高亮
        return false;
      }
      
      // 对于其他情况，保持原来的前缀匹配逻辑
      // 但要确保父级路径后有斜杠再做前缀匹配
      return currentPath.startsWith(menuPath + "/");
    };
    
    const currentPath = pathname === "/" ? "/dashboard" : pathname;
    const isActive = isMenuPathActive(item.path, currentPath);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus.has(item.id);
    const name = item.name || item.title || "";
    
    // 折叠状态下的菜单项
    if (collapsed) {
      return (
        <li key={item.id} className="relative group">
          <div
            className={cn(
              "flex justify-center items-center py-2 rounded-md transition-colors cursor-pointer",
              isActive
                ? "text-white"
                : "text-blue-100 hover:bg-blue-700/30"
            )}
            title={name}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!hasChildren) {
                const tabId = addTab({
                  label: name,
                  path: item.path,
                  closable: item.path !== "/dashboard"
                });
              }
            }}
          >
            {getLucideIcon(item.icon || "")}
            
            {/* 悬浮提示 */}
            {hasChildren ? (
              <div className="absolute left-full ml-2 hidden group-hover:block z-50 bg-blue-800 rounded-md shadow-lg py-1 min-w-40">
                <div className="font-medium px-3 py-1 border-b border-blue-700">{name}</div>
                <ul className="py-1">
                  {item.children!.map((child) => (
                    <li key={child.id}>
                      <a
                        href={child.path}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const tabId = addTab({
                            label: child.name || child.title || "",
                            path: child.path,
                            closable: true
                          });
                        }}
                        className={cn(
                          "flex items-center px-3 py-1 transition-colors",
                          isMenuPathActive(child.path, currentPath)
                            ? "bg-blue-700 text-white font-medium"
                            : "text-blue-100 hover:bg-blue-700/30"
                        )}
                      >
                        {getLucideIcon(child.icon || "")}
                        <span>{child.name || child.title}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="absolute left-full ml-2 hidden group-hover:block z-50 bg-blue-800 rounded-md shadow-lg px-3 py-1 whitespace-nowrap">
                {name}
              </div>
            )}
          </div>
        </li>
      );
    }
    
    // 展开状态下的菜单项
    return (
      <li key={item.id}>
        {hasChildren ? (
          <>
            <button
              onClick={(e) => toggleMenu(item.id, e)}
              className={cn(
                "flex items-center w-full py-2 px-3 rounded-md transition-colors",
                isActive
                  ? "text-white font-medium"
                  : "text-blue-100 hover:bg-blue-700/30"
              )}
            >
              {getLucideIcon(item.icon || "")}
              <span>{name}</span>
              <span className="ml-auto">
                {isExpanded ? (
                  <LucideIcons.ChevronDown className="h-4 w-4" />
                ) : (
                  <LucideIcons.ChevronRight className="h-4 w-4" />
                )}
              </span>
            </button>
            
            {isExpanded && (
              <ul className="ml-4 mt-1 space-y-1">
                {item.children!.map((child) => (
                  <li key={child.id}>
                    <a
                      href={child.path}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // 使用addTab返回的标签ID，在TabContext中处理，确保标签被激活并导航
                        const tabId = addTab({
                          label: child.name || child.title || "",
                          path: child.path,
                          closable: true
                        });
                      }}
                      className={cn(
                        "flex items-center py-2 px-3 rounded-md transition-colors",
                        isMenuPathActive(child.path, currentPath)
                          ? "bg-blue-700 text-white font-medium"
                          : "text-blue-100 hover:bg-blue-700/30"
                      )}
                    >
                      {getLucideIcon(child.icon || "")}
                      <span>{child.name || child.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <a
            href={item.path}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // 使用addTab返回的标签ID，在TabContext中处理，确保标签被激活并导航
              const tabId = addTab({
                label: name,
                path: item.path,
                closable: item.path !== "/dashboard" // 仪表盘不可关闭
              });
            }}
            className={cn(
              "flex items-center py-2 px-3 rounded-md transition-colors",
              isActive
                ? "text-white font-medium"
                : "text-blue-100 hover:bg-blue-700/30"
            )}
          >
            {getLucideIcon(item.icon || "")}
            <span>{name}</span>
          </a>
        )}
      </li>
    );
  };

  return (
    <div className={cn(
      "border-r bg-[#2563eb] h-full flex flex-col text-white transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "border-b border-blue-500 flex items-center justify-between",
        collapsed ? "p-2" : "p-4"
      )}>
        {!collapsed && <h2 className="text-lg font-bold">超级管理员</h2>}
        <button 
          onClick={toggleCollapsed}
          className="p-1 rounded-md hover:bg-blue-700 transition-colors"
          title={collapsed ? "展开菜单" : "折叠菜单"}
        >
          {collapsed ? (
            <LucideIcons.ChevronRight className="h-5 w-5" />
          ) : (
            <LucideIcons.ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-auto p-2">
        {loading ? (
          // 加载状态
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 rounded animate-pulse bg-blue-400"></div>
            ))}
          </div>
        ) : menus.length > 0 ? (
          // 菜单项
          <ul className="space-y-1">
            {menus.map(renderMenuItem)}
          </ul>
        ) : (
          // 无菜单数据
          <div className={cn(
            "text-center py-8 text-blue-200",
            collapsed && "text-xs px-0"
          )}>
            <p>{collapsed ? "无菜单" : "暂无菜单数据"}</p>
          </div>
        )}
      </nav>
    </div>
  );
} 