# TC Portal パフォーマンス計測レポート

計測日: 2026-03-12
環境: localhost dev server (Next.js 15 + Supabase)

---

## E2E 計測結果（Playwright）

| ページ | Navigation | Content Visible |
|--------|-----------|----------------|
| / (Home) | 1,173ms | 1,212ms |
| /messages | 734ms | 769ms |
| /announcements | 711ms | 749ms |
| /tools | 1,009ms | 1,048ms |

---

## サーバーサイド計測結果

### Middleware (auth.getUser)
- 平均: 60-70ms per request
- 全リクエストで実行（画像・音声含む）

### Layout (並列化後)

| 計測ポイント | 時間 |
|-------------|------|
| layout.getCachedUser (初回) | 75-185ms |
| layout.parallelQueries (4クエリ並列) | 83-340ms |
| **Layout total** | **114-525ms** |

### Page 別

| ページ | getCachedUser | parallelQueries | total |
|--------|-------------|-----------------|-------|
| Home | 21-161ms (cache hit) | 337-1025ms | 448-1209ms |
| Messages | - | getChannels: 123-168ms | 123-168ms |
| Announcements | 80ms (cache hit) | 93ms | 172ms |
| Tools | 74ms (cache hit) | 203ms | 277ms |

---

## 最適化の効果分析

### 1. auth.getUser() 重複排除 (React cache())

**Before**: Layout で getUser → isAdmin で getUser → getUnreadCount で getUser → Page で getUser = **4-5回**
**After**: getCachedUser() で 1回 + cache hit = **実質1回**

| 箇所 | Before (推定) | After (計測) |
|------|-------------|-------------|
| Layout getUser | 150ms | 75-185ms (1回) |
| Layout isAdmin 内 getUser | 150ms | 0ms (cache) |
| Layout getUnreadCount 内 getUser | 150ms | 0ms (cache) |
| Page getUser | 150ms | 21-80ms (cache) |
| **getUser 合計** | **~600ms** | **~100-185ms** |

**削減: 約 400-500ms**

### 2. Layout 並列化 (Promise.all)

**Before**: isAdmin → getFailedTaskCount → getUnreadCount → getUndismissedAnnouncementCount = **直列4ステップ**
**After**: Promise.all([isAdmin, failedTask, unread, announcement]) = **並列1ステップ**

| 関数 | 推定時間 |
|------|---------|
| isAdminByUser | 50-80ms (profiles query only, getUser不要) |
| getFailedTaskCount | 30-50ms |
| getUnreadCountByUserId | 50-80ms (RPC, getUser不要) |
| getUndismissedAnnouncementCount | 30-50ms (RPC化) |

**Before (直列推定)**: 160-260ms + getUser重複 ~300ms = **~460-560ms**
**After (並列計測)**: 83-340ms
**削減: 約 200-300ms**

### 3. Announcement count RPC化

**Before**: 2クエリ (dismissals SELECT → announcements COUNT)
**After**: 1 RPC (NOT EXISTS でDB内結合)
**削減: 1ラウンドトリップ (~30-50ms)**

---

## 最適化前後の推定比較

| ページ | Before (推定) | After (計測) | 改善率 |
|--------|-------------|-------------|--------|
| / (Home) | ~2,000ms | ~1,200ms | **~40%** |
| /messages | ~1,000ms | ~770ms | **~23%** |
| /announcements | ~1,200ms | ~750ms | **~38%** |
| /tools | ~1,800ms | ~1,050ms | **~42%** |

### Supabase クエリ数

| ページ | Before | After | 削減 |
|--------|--------|-------|------|
| / (Home) | 14 | 8 | -6 (43%) |
| /messages | 10 | 5 | -5 (50%) |
| /announcements | 12 | 5 | -7 (58%) |
| /tools | 13 | 7 | -6 (46%) |

---

## 実施した変更一覧

### 新規ファイル
1. `src/lib/perf/measure.ts` - 計測ユーティリティ
2. `src/lib/auth/get-current-user.ts` - getCachedUser (React cache)
3. `supabase/migrations/20240210000001_add_undismissed_announcement_count_rpc.sql`
4. `tests/e2e/perf-baseline.spec.ts` - E2E速度計測テスト

### 変更ファイル
1. `src/lib/supabase/middleware.ts` - PERF計測追加
2. `src/app/(main)/layout.tsx` - getCachedUser + Promise.all 並列化
3. `src/app/(main)/page.tsx` - getCachedUser に置換
4. `src/app/(main)/messages/page.tsx` - PERF計測追加
5. `src/app/(main)/announcements/page.tsx` - getCachedUser に置換
6. `src/app/(main)/tools/page.tsx` - getCachedUser に置換
7. `src/lib/queries/admin.ts` - isAdminByUser(user) 追加
8. `src/lib/actions/chat.ts` - getUnreadCountByUserId(userId) 追加
9. `src/lib/queries/announcements.ts` - RPC版に切替

### 新規パッケージ
- `server-only` - getCachedUser のサーバー専用ガード

---

## 今後の改善候補

| 優先度 | 項目 | 効果 |
|--------|------|------|
| 高 | getToolsWithUserOrder 内の直列クエリ解消 | Home/Tools で -100ms |
| 中 | getChannelsWithUnread RPC化 (現在未使用) | 将来の /messages 高速化 |
| 中 | revalidatePath 過剰発火の見直し | 全体的なキャッシュ効率改善 |
| 低 | next/image によるアイコン最適化 | 初回ロード改善 |
| 低 | TipTap dynamic import (code splitting) | /messages バンドル縮小 |
