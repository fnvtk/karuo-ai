import os
import zipfile
import paramiko

# 配置
local_dir = './dist'  # 本地要打包的目录
zip_name = 'dist.zip'
# 上传到服务器的 zip 路径
remote_path = '/www/wwwroot/auto-devlop/tkb-wechat/dist.zip'  # 服务器上的临时zip路径
server_ip = '42.194.245.239'
server_port = 6523
server_user = 'yongpxu'
server_pwd = 'Aa123456789.'
# 服务器 dist 相关目录
remote_base_dir = '/www/wwwroot/auto-devlop/tkb-wechat'
dist_dir = f'{remote_base_dir}/dist'
dist1_dir = f'{remote_base_dir}/dist1'
dist2_dir = f'{remote_base_dir}/dist2'

# 美化输出用的函数
from datetime import datetime

def info(msg):
    print(f"\033[36m[INFO {datetime.now().strftime('%H:%M:%S')}] {msg}\033[0m")

def success(msg):
    print(f"\033[32m[SUCCESS] {msg}\033[0m")

def error(msg):
    print(f"\033[31m[ERROR] {msg}\033[0m")

def step(msg):
    print(f"\n\033[35m==== {msg} ====" + "\033[0m")

# 1. 先运行 pnpm build
step('Step 1: 构建项目 (pnpm build)')
info('开始执行 pnpm build...')
ret = os.system('pnpm build')
if ret != 0:
    error('pnpm build 失败，终止部署！')
    exit(1)
success('pnpm build 完成')

# 2. 打包
step('Step 2: 打包 dist 目录为 zip')
info('开始打包 dist 目录...')
with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            filepath = os.path.join(root, file)
            arcname = os.path.relpath(filepath, local_dir)
            zipf.write(filepath, arcname)
success('本地打包完成')

# 3. 上传
step('Step 3: 上传 zip 包到服务器')
info('开始上传 zip 包...')

# 获取本地文件大小
local_size = os.path.getsize(zip_name)
info(f'本地文件大小: {local_size / 1024 / 1024:.2f} MB')

transport = paramiko.Transport((server_ip, server_port))
transport.connect(username=server_user, password=server_pwd)
sftp = paramiko.SFTPClient.from_transport(transport)

try:
    # 如果远程文件已存在，先删除
    try:
        sftp.remove(remote_path)
        info('已删除远程旧文件')
    except:
        pass  # 文件不存在，忽略

    # 确保远程目录存在
    remote_dir = os.path.dirname(remote_path)
    try:
        sftp.stat(remote_dir)
    except:
        error(f'远程目录不存在: {remote_dir}')
        raise

    # 上传进度回调
    def progress_callback(transferred, total):
        percent = (transferred / total) * 100
        if transferred % (1024 * 1024) == 0 or transferred == total:  # 每MB或完成时显示
            info(f'上传进度: {transferred / 1024 / 1024:.2f}MB / {total / 1024 / 1024:.2f}MB ({percent:.1f}%)')

    # 上传文件
    sftp.put(zip_name, remote_path, callback=progress_callback, confirm=True)

    # 验证远程文件大小
    remote_size = sftp.stat(remote_path).st_size
    info(f'远程文件大小: {remote_size / 1024 / 1024:.2f} MB')

    if remote_size != local_size:
        raise IOError(f'文件大小不匹配！本地: {local_size}, 远程: {remote_size}')

    success('上传到服务器完成')

finally:
    sftp.close()
    transport.close()

# 删除本地 dist.zip
try:
    os.remove(zip_name)
    success('本地 dist.zip 已删除')
except Exception as e:
    error(f'本地 dist.zip 删除失败: {e}')

# 4. 远程解压并覆盖
step('Step 4: 服务器端解压、切换目录')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(server_ip, server_port, server_user, server_pwd)
commands = [
    f'unzip -oq {remote_path} -d {dist2_dir}',  # 静默解压
    f'rm {remote_path}',
    f'if [ -d {dist_dir} ]; then mv {dist_dir} {dist1_dir}; fi',
    f'mv {dist2_dir} {dist_dir}',
    f'rm -rf {dist1_dir}'
]
for i, cmd in enumerate(commands, 1):
    info(f'执行第{i}步: {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out, err = stdout.read().decode(), stderr.read().decode()
    # 只打印非 unzip 命令的输出
    if i != 1 and out.strip():
        print(out.strip())
    if err.strip():
        error(err.strip())
ssh.close()
success('服务器解压并覆盖完成，部署成功！')
