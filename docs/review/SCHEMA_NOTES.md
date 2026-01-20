# TC Portal スキーマ・マイグレーション注意事項

## 概要

このドキュメントでは、マイグレーションファイル間の不整合や、
スキーマ管理上の注意点を記録します。

---

## マイグレーション不整合

### 1. `tool_orders` テーブル定義の重複

**ファイル:**
- `20240113000001_create_tables.sql` (初期作成)
- `20240114000001_add_tool_orders.sql` (追加作成)

**問題:**
2つのマイグレーションで `tool_orders` テーブルを作成しており、スキーマが異なる。

| 項目 | create_tables.sql | add_tool_orders.sql |
|------|-------------------|---------------------|
| context カラム | あり (`home`, `tools`) | なし |
| updated_at カラム | なし | あり |
| PRIMARY KEY | `(user_id, tool_id, context)` | `(user_id, tool_id)` |

**現状:**
`add_tool_orders.sql` は `CREATE TABLE IF NOT EXISTS` を使用しているため、
`create_tables.sql` が先に実行されていれば無視される。
しかし、RLSポリシーが重複して作成される。

**推奨対応:**
- 本番環境では `create_tables.sql` の `tool_orders` 定義が使用される
- `context` カラムは使用されていないため、将来的に削除を検討
- `updated_at` カラムは `create_tables.sql` に追加するか、別マイグレーションで追加

---

### 2. `tools` テーブルのアイコンカラム重複

**ファイル:**
- `20240113000001_create_tables.sql` (初期作成)
- `20240119000001_add_tool_icon_upload.sql` (カラム追加)

**問題:**
`create_tables.sql` で既に `icon_mode`, `icon_key`, `icon_path` が定義されているが、
`add_tool_icon_upload.sql` でも同じカラムを追加しようとしている。

```sql
-- add_tool_icon_upload.sql
ALTER TABLE public.tools
  ADD COLUMN icon_mode TEXT ...,
  ADD COLUMN icon_key TEXT ...,
  ADD COLUMN icon_path TEXT ...;

-- 存在しない icon カラムから移行しようとしている
UPDATE public.tools SET icon_key = icon WHERE icon IS NOT NULL;
```

**現状:**
PostgreSQL の `ADD COLUMN` はカラムが既存の場合エラーになる可能性がある。
ただし、マイグレーション順序によっては問題なく動作する可能性もある。

**推奨対応:**
- `add_tool_icon_upload.sql` に `ADD COLUMN IF NOT EXISTS` を使用
- または `create_tables.sql` からアイコンカラムを削除し、
  `add_tool_icon_upload.sql` で追加する形に統一

---

### 3. RLSポリシーの重複

**ファイル:**
- `20240113000002_rls_policies.sql`
- `20240114000001_add_tool_orders.sql`

**問題:**
両方のファイルで `tool_orders` テーブルに対するRLSポリシーを作成している。
ポリシー名が異なるため両方作成されるが、機能的に重複。

| rls_policies.sql | add_tool_orders.sql |
|------------------|---------------------|
| "Users can view own tool_orders" | "Users can view own tool orders" |
| "Users can insert own tool_orders" | "Users can insert own tool orders" |
| "Users can update own tool_orders" | "Users can update own tool orders" |
| "Users can delete own tool_orders" | "Users can delete own tool orders" |

**推奨対応:**
- `add_tool_orders.sql` から RLS ポリシー作成を削除
- または `CREATE POLICY IF NOT EXISTS` 相当の処理を追加

---

## SECURITY DEFINER 関数

### 一覧

| 関数名 | 用途 | 呼び出し元 | 権限 |
|--------|------|------------|------|
| `handle_new_user()` | ユーザー作成時にprofile自動作成 | auth.users トリガー | (Supabase内部) |
| `is_admin()` | admin判定 | RLSポリシー | authenticated |
| `claim_run()` | Runner用キュー取得 | Runner API | service_role のみ |

### セキュリティ対策

1. **claim_run()** - `20240122000001_secure_claim_run.sql` で service_role のみに制限
2. 全関数に `SET search_path = public` を設定

---

## 検証クエリ

### SECURITY DEFINER 関数の権限確認

```sql
-- SECURITY DEFINER 関数一覧と権限
SELECT
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  pg_get_functiondef(p.oid) AS definition,
  ARRAY(
    SELECT rolname
    FROM pg_roles r
    JOIN (
      SELECT (aclexplode(p.proacl)).grantee AS grantee
    ) acl ON r.oid = acl.grantee
  ) AS granted_to
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true;
```

### RLSポリシー一覧

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### テーブル構造確認

```sql
-- tools テーブルの全カラム
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tools'
ORDER BY ordinal_position;

-- tool_orders テーブルの全カラム
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tool_orders'
ORDER BY ordinal_position;
```

### 制約確認

```sql
-- tools テーブルの CHECK 制約
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.tools'::regclass
  AND contype = 'c';
```

---

## 推奨マイグレーション順序

本番環境では以下の順序で適用することを推奨:

1. `20240113000001_create_tables.sql`
2. `20240113000002_rls_policies.sql`
3. `20240113000003_add_target_and_storage.sql`
4. `20240115000001_add_runs_and_machines.sql`
5. `20240115000002_add_folder_tool_type.sql`
6. `20240115000003_add_bat_tool_type.sql`
7. `20240116000001_add_helper_execution_mode.sql`
8. `20240117000001_add_tools_tags.sql`
9. `20240118000001_add_pins_sort_order.sql`
10. `20240120000001_allow_all_users_manage_tools.sql`
11. `20240121000001_fix_execution_mode_consistency.sql`
12. `20240122000001_secure_claim_run.sql`

**スキップ推奨:**
- `20240114000001_add_tool_orders.sql` - 重複のため
- `20240119000001_add_tool_icon_upload.sql` - 重複のため

---

## 今後の改善提案

1. **マイグレーション整理**: 重複を解消した統合マイグレーションの作成
2. **スキーマスナップショット**: `schema.current.sql` を定期的に更新
3. **CI検証**: マイグレーション適用テストの自動化
