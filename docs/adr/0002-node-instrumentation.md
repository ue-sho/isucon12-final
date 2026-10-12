# ADR-0002：Node.jsの計測方式

状態：提案。2026-10-12。

## 背景

対象言語はNode.jsで固定だが、フレームワーク、ドライバー、プロトコルは変わる。OTelは対応ライブラリをソース変更なしで計測できる一方、アプリ内部の処理区分やCPU実行箇所は自動では得られない。

## 課題

すべての自動計測を有効にすると不要なSpan、依存関係、計測負荷が増える。Span時間はCPU時間ではない。ESM、bundle、ドライバーのバージョン、起動順により計測できない場合がある。長時間接続を通常HTTPと同じ指標で評価できない。

## 選択肢

1. 全自動計測を常時有効：導入は簡単だが負荷と意味の検証が難しい。
2. HTTP・DB等を選択して自動計測：最小改修で因果関係を得られるが内部処理は見えない。
3. 全handlerを手動計測：意味は明確だが競技ごとの改修が増える。
4. perf/eBPFのみ：OSの制約を追えるがNodeの非同期文脈やV8フレームの復元は環境依存。
5. Node/V8 CPU Profileのみ：CPU実行箇所に強いがDB待機やN+1を説明できない。

## 結論

選択肢2を診断モードとして採用し、短時間CPU Profile、Event Loop計測、DBサーバー統計と併用する。まずHTTPと実際に使われているMySQLドライバーだけを対象にする。必要な処理区間、pool待ち、stream message処理だけ手動計測を追加する。

Nodeの起動前preloadを基本とし、ESMは公式loader対応と対象バージョンで確認する。CPU ProfileはInspectorによる時間限定取得を第一候補、起動時の`--cpu-prof`を代替にする。後者は起動・終了・ファイル確定が必要で運用が異なる。

## 影響

ソース変更なしでも起動設定・依存追加・再起動は必要。Trace samplingを0にしてもpatchやcontext管理の負荷がゼロになるとは限らない。完全OFFはpreloadを外して再起動する。

pprof/fgprofの形式・wall time分析をV8 CPU Profileでそのまま代替できるとはみなさない。CPU Profileは基本的にisolate単位で、cluster・Workerを別々に管理する。

## 再検討条件

診断モードのスコア低下が許容できない、対象ライブラリに計測欠落がある、stream主体の問題である場合。OTelを減らし、対象限定計測やサーバーログへ切り替える。

根拠：[JS zero-code](https://opentelemetry.io/docs/zero-code/js/)、[JS instrumentationとESM](https://opentelemetry.io/docs/languages/js/libraries/)、[Node Inspector](https://nodejs.org/api/inspector.html)。
