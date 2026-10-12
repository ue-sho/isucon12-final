# ISUCON計測・分析基盤の設計

現段階は設計・比較検討のみ。計測コード、サービス、設定ファイルは実装していない。

- [設計提案：A〜J](observability-design.md)
- [ADR一覧](adr/README.md)
- [参考資料・確認範囲](references.md)

推奨案は、pproteinを参考にしたNode.js向けの実行単位の計測・比較ツール。既存CLI、ファイル保存、DuckDBを土台にし、必要なときだけOTel TraceとCPU Profileを追加する。ClickHouseは複数人によるリアルタイム分析が必要になった段階で再評価する。

ADRは提案状態であり、実機検証済みの決定ではない。数値の設定例は検証開始値であり、性能保証ではない。
