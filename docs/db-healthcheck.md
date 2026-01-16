# TC Portal Database Health Check

実行日時: 2026-01-15T07:46:19.083Z

---

## 1. tools by tool_type

| tool_type | count |
| --- | --- |
| url | 4 |
| bi | 2 |
| python_runner | 4 |
| sheet | 2 |
| pad | 2 |
| exe | 2 |
| excel | 2 |
| folder_set | 2 |
| bat | 1 |

## 2. tools by execution_mode

| execution_mode | count |
| --- | --- |
| open | 21 |

## 3. runs by status

| status | count |
| --- | --- |
| failed | 7 |
| success | 71 |

## 4. runs by tool_type and status

| tool_type | status | count |
| --- | --- | --- |
| exe | success | 26 |
| python_runner | failed | 3 |
| python_runner | success | 7 |
| excel | success | 18 |
| excel | failed | 3 |
| folder_set | success | 9 |
| bi | success | 2 |
| pad | success | 2 |
| pad | failed | 1 |
| sheet | success | 3 |
| bat | success | 4 |

## 5. anomalous runs (finished_at NULL)

_データなし_

## 6. currently pending runs

_データなし_

## 7. latest exe runs

| id | status | summary | error_message | requested_at | finished_at | tools |
| --- | --- | --- | --- | --- | --- | --- |
| 72ab2d09-04d8-4b8f-8fb9-26400e0e8de5 | success | EXE launched | _null_ | 2026-01-15T04:43:34.644046+00:00 | 2026-01-15T04:43:51.242+00:00 | {"name":"メモ帳テスト","tool_type":"exe"} |
| 60caf43f-9adc-4391-ad11-2b56cf9bf319 | success | EXE launched | _null_ | 2026-01-15T02:08:31.99425+00:00 | 2026-01-15T02:08:39.218+00:00 | {"name":"ねっぱん在庫取得","tool_type":"exe"} |
| 949bb9cb-4d42-477f-841f-588222e4622c | success | EXE launched | _null_ | 2026-01-15T01:51:45.063152+00:00 | 2026-01-15T01:51:57.442+00:00 | {"name":"メモ帳テスト","tool_type":"exe"} |
| 24d7326b-4438-4f64-926d-6bea6dea5b0a | success | EXE launched | _null_ | 2026-01-15T01:35:02.837595+00:00 | 2026-01-15T01:35:05.048+00:00 | {"name":"ねっぱん在庫取得","tool_type":"exe"} |
| e7512f1a-5c05-483e-94fb-ad02f6298ca9 | success | EXE launched | _null_ | 2026-01-15T01:33:58.943208+00:00 | 2026-01-15T01:34:04.393+00:00 | {"name":"ねっぱん在庫取得","tool_type":"exe"} |
| 389a3592-c642-47fc-97da-948aff22ae88 | success | EXE launched | _null_ | 2026-01-15T01:32:24.8663+00:00 | 2026-01-15T01:32:43.556+00:00 | {"name":"メモ帳テスト","tool_type":"exe"} |
| df29f291-0eed-49aa-b6dd-079f8f78025e | success | EXE launched | _null_ | 2026-01-15T01:32:14.528505+00:00 | 2026-01-15T01:32:27.753+00:00 | {"name":"メモ帳テスト","tool_type":"exe"} |
| 0588ef95-d3d9-4e74-8d82-fbe5a946892d | success | EXE launched | _null_ | 2026-01-15T01:31:57.091922+00:00 | 2026-01-15T01:32:01.633+00:00 | {"name":"ねっぱん在庫取得","tool_type":"exe"} |
| 298c63da-d6c1-4220-8757-e8e344aecb69 | success | EXE launched | _null_ | 2026-01-15T01:31:42.195414+00:00 | 2026-01-15T01:31:55.11+00:00 | {"name":"メモ帳テスト","tool_type":"exe"} |
| 3f881ff2-4610-411a-8447-714f9c43b69c | success | EXE launched | _null_ | 2026-01-15T01:31:23.247556+00:00 | 2026-01-15T01:31:34.2+00:00 | {"name":"メモ帳テスト","tool_type":"exe"} |

## 8. machines

| id | name | enabled | last_seen_at | created_at |
| --- | --- | --- | --- | --- |
| 90d0eba2-5c28-4b66-b125-16df9a31d948 | test-runner-01 | true | 2026-01-15T06:09:44.166632+00:00 | 2026-01-14T06:22:25.38148+00:00 |

## 9. categories

| id | name | sort_index | tool_count |
| --- | --- | --- | --- |
| 11111111-1111-1111-1111-111111111101 | 全体の健康診断 | 1 | 2 |
| 11111111-1111-1111-1111-111111111102 | 料金変動の時に使うもの | 2 | 2 |
| 11111111-1111-1111-1111-111111111103 | その他 | 3 | 10 |
| 11111111-1111-1111-1111-111111111104 | コッシー | 4 | 2 |
| 11111111-1111-1111-1111-111111111105 | 玉城 | 5 | 1 |
| 11111111-1111-1111-1111-111111111106 | 大城 | 6 | 1 |
| 11111111-1111-1111-1111-111111111107 | 神里 | 7 | 2 |
| 11111111-1111-1111-1111-111111111108 | 奥平 | 8 | 1 |

## 10. tool_last_success

| tool_id | last_success_at | tool_name | tool_type |
| --- | --- | --- | --- |
| 4e04ca9e-aa06-40f3-8d7e-76a28e61587e | 2026-01-15T06:09:44.268+00:00 | スプレッドシートテスト | sheet |
| 680da01b-1426-4869-a040-282826eb5d73 | 2026-01-15T06:09:27.939+00:00 | Pythonテスト（イベント情報） | python_runner |
| f0c3510c-cef0-4b33-a937-87c16a8ee4c2 | 2026-01-15T06:06:21.896+00:00 | Pythonテスト（venv直接） | python_runner |
| 4429cb1d-c9b6-432f-8041-23d6b887b469 | 2026-01-15T05:42:57.557+00:00 | Python簡易テスト | python_runner |
| fe9fe1d7-61c9-4992-91ef-5b4a2c06977e | 2026-01-15T05:30:10.047+00:00 | PADテスト（リンカーン在庫） | pad |
| 78ba8dc4-8b2c-49cd-9866-35c09d8501b4 | 2026-01-15T05:17:20.275+00:00 | BIテスト | bi |
| 016d4e8e-1d6d-4184-b28b-536f4bc11d5d | 2026-01-15T05:14:40.182+00:00 | BATテスト | bat |
| 3a9fe739-aa73-4bfa-826c-e35efd1eaed4 | 2026-01-15T05:12:21.945+00:00 | エクセルテスト | excel |
| da8fdfd0-ff13-4898-a063-9f2d0748a857 | 2026-01-15T04:50:09.655+00:00 | フォルダテスト | folder_set |
| 0e5f72da-8581-4aaf-b51b-219ccf45eeba | 2026-01-15T04:43:51.242+00:00 | メモ帳テスト | exe |
| 22222222-2222-2222-2222-222222222202 | 2026-01-15T04:35:41.645+00:00 | 料金計算シート | excel |
| 337a8164-b8ae-4c6e-9a7d-e6fdfa900080 | 2026-01-15T02:08:39.218+00:00 | ねっぱん在庫取得 | exe |

## 11. runs.log_url統計

- **total_runs_with_log_url**: 0
### by_tool_type

| tool_type | total_runs | with_log_url | ratio |
| --- | --- | --- | --- |
| exe | 26 | 0 | 0.0% |
| python_runner | 10 | 0 | 0.0% |
| excel | 21 | 0 | 0.0% |
| folder_set | 9 | 0 | 0.0% |
| bi | 2 | 0 | 0.0% |
| pad | 3 | 0 | 0.0% |
| sheet | 3 | 0 | 0.0% |
| bat | 4 | 0 | 0.0% |


## 12. runs.machine_id統計

- **total_runs_without_machine_id**: 0
### by_tool_type

| tool_type | total_runs | with_machine_id | null_machine_id |
| --- | --- | --- | --- |
| exe | 26 | 26 | 0 |
| python_runner | 10 | 10 | 0 |
| excel | 21 | 21 | 0 |
| folder_set | 9 | 9 | 0 |
| bi | 2 | 2 | 0 |
| pad | 3 | 3 | 0 |
| sheet | 3 | 3 | 0 |
| bat | 4 | 4 | 0 |


## 13. execution_mode整合性チェック

- **mismatch_count**: 15
### mismatches

| id | name | tool_type | actual_mode | expected_modes |
| --- | --- | --- | --- | --- |
| 22222222-2222-2222-2222-222222222204 | コッシー専用ダッシュボード | bi | open | helper |
| 22222222-2222-2222-2222-222222222205 | 玉城レポートツール | python_runner | open | queue |
| 22222222-2222-2222-2222-222222222207 | 神里自動化ツール | pad | open | queue |
| 4429cb1d-c9b6-432f-8041-23d6b887b469 | Python簡易テスト | python_runner | open | queue |
| 0e5f72da-8581-4aaf-b51b-219ccf45eeba | メモ帳テスト | exe | open | queue or helper |
| 337a8164-b8ae-4c6e-9a7d-e6fdfa900080 | ねっぱん在庫取得 | exe | open | queue or helper |
| 680da01b-1426-4869-a040-282826eb5d73 | Pythonテスト（イベント情報） | python_runner | open | queue |
| f0c3510c-cef0-4b33-a937-87c16a8ee4c2 | Pythonテスト（venv直接） | python_runner | open | queue |
| 22222222-2222-2222-2222-222222222202 | 料金計算シート | excel | open | helper |
| 22222222-2222-2222-2222-222222222203 | 共有フォルダ一覧 | folder_set | open | helper |
| 3a9fe739-aa73-4bfa-826c-e35efd1eaed4 | エクセルテスト | excel | open | helper |
| 78ba8dc4-8b2c-49cd-9866-35c09d8501b4 | BIテスト | bi | open | helper |
| 016d4e8e-1d6d-4184-b28b-536f4bc11d5d | BATテスト | bat | open | helper |
| da8fdfd0-ff13-4898-a063-9f2d0748a857 | フォルダテスト | folder_set | open | helper |
| fe9fe1d7-61c9-4992-91ef-5b4a2c06977e | PADテスト（リンカーン在庫） | pad | open | queue |


## 14. Summary Statistics

- **totalTools**: 21
- **activeTools**: 21
- **archivedTools**: 0
- **totalRuns**: 78
- **successRuns**: 71
- **failedRuns**: 7
- **totalCategories**: 8
- **totalMachines**: 1
- **runsWithLogUrl**: 0
- **runsWithoutMachineId**: 0
- **executionModeMismatches**: 15

