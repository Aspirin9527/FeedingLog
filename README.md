# 喂奶记录

一个适合手机和桌面使用的喂奶记录应用。默认使用浏览器本地 IndexedDB 保存数据；配置 Supabase 后可按“家庭”为单位在线同步，多人共同查看和操作同一组记录。

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

部署配置：

- Build command: `npm run build`
- Output directory: `dist`

## 云端家庭同步

不配置环境变量时，应用保持本地模式。配置 Supabase 后，应用会启用账号密码注册/登录、创建家庭、邀请码加入家庭和实时记录同步。

1. 在 Supabase 创建项目。
2. 在 Supabase SQL Editor 执行 `docs/supabase-family-sync.sql`。
3. 复制 `.env.example` 为 `.env.local`。
4. 填入：

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. 启动应用：

```bash
npm run dev
```

## 多人协作模型

- 一个家庭对应一组喂奶记录。
- 家庭成员通过邀请码加入同一家庭。
- 每条记录写入 `family_id`，只有该家庭成员可以读写。
- 删除采用软删除，便于实时同步和未来冲突处理。
- 当前冲突策略是最后一次写入生效。

## 账号注册说明

- 页面只要求输入自定义账号和密码。
- 账号只允许使用 `3-32` 位字母、数字或下划线。
- 内部会把账号映射到 Supabase Auth 使用的本地域名邮箱，用户不需要填写邮箱。
- Supabase 项目需要关闭 Email Provider 的 `Confirm email`，否则注册后仍会要求邮箱确认。
