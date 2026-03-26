# Relative Ear Trainer

## Overview
2 音間の音程を聴き取る相対音感トレーニングアプリ。練習、統計、設定の3タブを持ち、Web 版と Capacitor ベースの iOS アプリの両方を前提に、無料プランと Pro 機能を切り分けている。

## Stack
- Framework: Next.js App Router + React + TypeScript
- Audio: 独自 `AudioEngine` と `soundfont-player` を使い、synth / piano / guitar を切り替える
- Native: Capacitor iOS 対応。Pro 購入は `cordova-plugin-purchase` を介した iOS ネイティブ課金を前提とする
- Storage: 統計と entitlement は Capacitor Preferences を優先し、Web では `localStorage` にフォールバックする

## Structure
- `app/page.tsx`: アプリ本体。出題ロジック、練習画面、統計画面、設定画面、Pro 導線、履歴ナビゲーションを統合管理する
- `app/lib/audioEngine.ts`: 音源切り替え、soundfont 読み込み、フォールバック、音再生を担う
- `app/lib/statsStore.ts`: 統計ストアの型、集計、永続化、日次バケット処理を担う
- `app/lib/entitlements.ts`: Pro 状態の永続化と既定値管理を担う
- `app/lib/proPurchase.ts`: iOS ネイティブ課金の初期化、購入、復元、購読状態通知を担う
- `app/lib/questionIdentity.ts`: 固定 root 時の連続同一問題回避ロジックを担う
- `app/lib/today.ts`: 履歴集計用の「今日」判定と開発用 virtual today を担う
- `app/lib/useProUpsell.tsx` / `app/components/ProUpsellModal.tsx`: Pro アップセル UI を担う

## Core Flows
- Practice タブでは Play を押すと現在設定に基づく 2 音問題を生成し、メロディックまたはハーモニーで再生する
- 問題生成時は選択中の interval pool、range、mode、direction、root mode を使って出題候補を決める。固定 root モードでは同一問題が連続しすぎないよう reroll する
- Melodic モードでは 2 音を順番に再生し、Harmony モードでは同時再生する
- 回答ボタンを押すと即座に正誤判定し、効果音を鳴らし、統計を更新する。誤答時は正解ラベルを表示する
- 回答後は Next Interval で次問題へ進む。interval pool や設定を変えた場合は現在ラウンドの結果表示をリセットする
- interval pool は最低 1 つの音程を維持する。最後の 1 つを外そうとした場合は警告を出して状態を維持する
- Preset を選ぶと対応する interval pool に一括で切り替える
- Practice 画面では回答後に keyboard を表示して基準音と出題音の位置関係を確認できる。回答済みで keyboard が見えている場合は対象音付近まで自動スクロールする
- Stats タブでは全期間の成績を常に表示する。History は Day / Week / Month で集計し、Pro のみ閲覧可能とする
- Settings タブでは言語、効果音、ノート長、音色、出題モード、方向、range、root mode、button size などを切り替える
- Piano / Guitar 音色は Pro 限定で、非 Pro から選ぼうとするとアップセルを開く。サンプル読込中やフォールバック状態は UI に反映する
- Pro 導線から購入または復元を実行できる。課金は iOS ネイティブ環境でのみ有効で、Web では購入不可メッセージを返す
- 開発ビルドでは dev tools から Pro 強制切替と virtual today を使えるが、production では無効化する

## Data Model
- 永続化される統計は `StatsStore = { version, allTime, daily }` 構造で保持する
- `allTime` と `daily[dateKey]` はどちらも `StatsBucket = { totalAnswered, totalCorrect, byInterval }` を持ち、`byInterval` は interval id ごとの回答数と正解数を記録する
- 統計保存先は Capacitor Preferences を優先し、利用できない環境では `localStorage` の `ryogyLabStatsV1` を使う
- Pro entitlement は真偽値として永続化し、保存先は Capacitor Preferences を優先、Web フォールバックでは `localStorage` の `relative-ear.isPro` を使う
- Root mode と instrument は Web では `localStorage` に保存し、次回起動時に復元する
- 開発ビルド時の virtual today 状態は `virtualTodayEnabled` と `virtualDateKey` で保存する
- 現在ラウンド、回答状態、結果表示、選択中 tab、履歴アンカー日付、sample 読込状態、購入処理中フラグ、keyboard 表示状態はメモリ上の UI 状態であり永続化しない
- AudioEngine 内の soundfont キャッシュ、現在 instrument、フォールバック文言、課金ストア接続状態もランタイム状態であり、再起動後は再初期化される

## Rules
- パラメータ範囲・初期値はコード上の定数を正とする。`SPEC.md` には重複記載しない
- Pro 機能の判定は entitlement とネイティブ課金状態の両方を考慮する。Web 上では購入フロー自体を成立させない前提で扱う
- 統計更新は回答時に即座にメモリ更新し、その後永続化する。履歴表示は `statsStore` の集計結果を正とする
- 開発専用機能である virtual today と Force Pro は production では無効とする
- 問題の重複回避ロジックや fixed root 時の再抽選ルールは `questionIdentity` を正とする

## Known Issues
- `app/page.tsx` に UI、出題、統計、課金導線、設定が集中しており変更影響範囲が広い
- Web 版では課金できず、Pro フローの最終確認は iOS ネイティブ実機前提になる
- 統計と entitlement はローカル保存ベースのため、バックアップやアカウント同期はない
- Soundfont 読込は環境依存で失敗しうるため、sample instrument 選択時に synth へフォールバックする場合がある
