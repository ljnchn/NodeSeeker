# 任务清单

## 项目描述

这是一个定时监控 nodeseek 社区 RSS ，解析 title，memo，creator，category 保存，并匹配用户设置的规则，进行 telegram bot 推送。

## 技术栈

1. 平台：cloudflare worker + honoJS + vite
2. 数据库：cloudflare D1
3. 数据结构：migrations\0001_initial.sql

## 功能列表

### 初始化页面

用户输入用户名，密码

### 登录页面

用户输入用户名，密码进入主页面

### 主页面（基础设置）

1. 绑定 telegram bot token，显示状态，自动设置当前页面域名+地址为 webhook 
2. 提示绑定 telegram chat id，显示状态
3. 是否只匹配标题
4. 是否停止推送

### 主页面（订阅管理）

1. 添加订阅
2. 删除订阅
3. 编辑订阅

### telegram bot 命令

1. /start 保存并返回用户信息
2. /stop 停止推送
3. /resume 恢复推送
4. /list 列出所有订阅
5. /add 添加订阅，多个词用空格分隔
6. /delete 根据订阅id删除订阅
7. /post 最近十条post，显示推送状态

### 定时任务

抓取 nodeseek 社区 RSS（https://rss.nodeseek.com/），解析 title，memo，creator，category 保存，并匹配用户设置的规则，进行 telegram bot 推送。



## 技术要求

1 功能分离，结构清晰
2 查询时需要考虑性能
3 逻辑参考 https://github.com/ljnchn/seeknode

