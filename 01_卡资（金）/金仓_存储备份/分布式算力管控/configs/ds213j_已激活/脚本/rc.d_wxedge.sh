#!/bin/sh
# 网心云 wxedge chroot 自启动（DS213j专用）
case "$1" in
    start)
        if ! pgrep -f wxedged > /dev/null 2>&1; then
            nohup /volume1/wxedge/chroot_start.sh > /volume1/wxedge/logs/chroot.log 2>&1 &
            echo "wxedge started: $(date)" >> /volume1/wxedge/logs/autostart.log
        fi
        ;;
    stop)
        killall wxedged containerd 2>/dev/null
        umount /volume1/wxedge/rootfs/proc 2>/dev/null
        umount /volume1/wxedge/rootfs/dev 2>/dev/null
        umount /volume1/wxedge/rootfs/storage 2>/dev/null
        umount /volume1/wxedge/rootfs/tmp 2>/dev/null
        umount /volume1/wxedge/rootfs/run 2>/dev/null
        umount /volume1/wxedge/rootfs/sys/fs/cgroup 2>/dev/null
        echo "wxedge stopped: $(date)" >> /volume1/wxedge/logs/autostart.log
        ;;
    status)
        if pgrep -f wxedged > /dev/null 2>&1; then
            echo "wxedge running"
        else
            echo "wxedge stopped"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|status}"
        ;;
esac
