#!/bin/sh
ROOTFS=/volume1/wxedge/rootfs
STORAGE=/volume1/wxedge/storage

mkdir -p $STORAGE $ROOTFS/storage $ROOTFS/tmp $ROOTFS/run $ROOTFS/proc $ROOTFS/dev

# 不挂sysfs（会遮盖cgroup目录）
mount -t proc proc $ROOTFS/proc 2>/dev/null
mount --bind /dev $ROOTFS/dev 2>/dev/null
mount --bind $STORAGE $ROOTFS/storage 2>/dev/null
mount -t tmpfs tmpfs $ROOTFS/tmp 2>/dev/null
mount -t tmpfs tmpfs $ROOTFS/run 2>/dev/null

# 确保cgroup有tmpfs（statfs需要）
mkdir -p $ROOTFS/sys/fs/cgroup
mount -t tmpfs fakecgroup $ROOTFS/sys/fs/cgroup 2>/dev/null
mkdir -p $ROOTFS/sys/fs/cgroup/memory $ROOTFS/sys/fs/cgroup/cpu $ROOTFS/sys/fs/cgroup/cpuset $ROOTFS/sys/fs/cgroup/devices $ROOTFS/sys/fs/cgroup/blkio $ROOTFS/sys/fs/cgroup/pids $ROOTFS/sys/fs/cgroup/systemd

cp /etc/resolv.conf $ROOTFS/etc/resolv.conf 2>/dev/null

chroot $ROOTFS /bin/sh -c '
cd /xyapp/miner.plugin-wxedge.ipk
rm -rf /run/containerd
./bin/containerd -c ./cfg/cntr.toml &
sleep 3
export GODEBUG=x509ignoreCN=0
./bin/wxedged -c ./cfg/wxedge.yaml &
wait
'
