# 参考資料・確認範囲

確認日：2026-10-12。最新版ドキュメントと競技環境のバージョンは一致しない場合がある。実装前にNode、SDK、instrumentation、Collector、DBの組み合わせを固定して再確認する。

| 資料 | 設計に利用した内容 |
|---|---|
| [参考記事](https://nonylene.hatenablog.jp/entry/2024/12/09/010951) | ClickHouse、Collector、Nginx Trace、Grafana、SQL集計の経験。Go環境の成功事例であり、Nodeの負荷保証ではない |
| [pprotein](https://github.com/kaz/pprotein) | Go向け、pprof/fgprof/alp/slp連携という位置付け |
| [pprotein integration](https://github.com/kaz/pprotein/tree/main/integration) | Goフレームワーク連携とstandaloneの存在。全内部コードの監査・Node接続の動作確認は未実施 |
| [OTel JS zero-code](https://opentelemetry.io/docs/zero-code/js/) | preloadによる導入、設定と対応範囲 |
| [OTel JS libraries](https://opentelemetry.io/docs/languages/js/libraries/) | library依存、ESM対応、個別instrumentation |
| [OTel JS status](https://opentelemetry.io/docs/languages/js/) | Trace/MetricとLogsの安定性の違い |
| [OTel JS contrib](https://github.com/open-telemetry/opentelemetry-js-contrib) | 各パッケージの対応範囲は個別確認が必要 |
| [HTTP metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/) | duration histogramの単位と定義 |
| [DB spans](https://opentelemetry.io/docs/specs/semconv/db/database-spans/) | client API duration、query summaryとquery textの区別 |
| [ClickHouse exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/clickhouseexporter/README.md) | signal別テーブル、Profileはdevelopment。exporterスキーマはSemConvそのものではない |
| [Collector internal telemetry](https://opentelemetry.io/docs/collector/internal-telemetry/) | exporter失敗、queue、Collector自身の監視 |
| [Tail sampling](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md) | 状態保持・サンプリング方式の制約 |
| [DuckDB Parquet](https://www.duckdb.org/docs/current/data/parquet/overview) | 複数ファイル読込・分析 |
| [DuckDB concurrency](https://duckdb.org/docs/lts/connect/concurrency) | 単一writerプロセスを基本とする運用 |
| [Node perf_hooks](https://nodejs.org/api/perf_hooks.html) | Event Loop delayはns、ELUはCPU使用率と異なる |
| [Node Inspector](https://nodejs.org/api/inspector.html) | V8 CPU Profile取得 |
| [Node CLI](https://nodejs.org/api/cli.html) | 起動時CPU Profile等 |
| [Nginx logging](https://docs.nginx.com/nginx/admin-guide/monitoring/logging/) | request/upstream時間、複数upstream、buffer |
| [MySQL digest](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-digests.html) | server側query digestと代表statement |
| [MySQL summary](https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html) | 累積統計とdigest容量の制約 |
| [PostgreSQL pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) | queryid、累積統計、導入要件 |
| [SQLite trace hook](https://www.sqlite.org/c3ref/trace_v2.html) | connection単位のtrace/profile callback |
| [PowerDNS API](https://doc.powerdns.com/authoritative/http-api/index.html) | Authoritativeの統計APIとPrometheus metrics |
| [Jaeger deployment](https://www.jaegertracing.io/docs/latest/deployment/) | 専用Trace backendという選択肢 |
| [Tempo deployment](https://grafana.com/docs/tempo/latest/setup/deployment/) | 配置・保存方式の選択肢 |

未検証：各手段の実測オーバーヘッド、対象Node版でのHTTP/2・stream対応、pprotein再利用の費用、外部分析マシン利用の競技規約。これらを事実として結論に織り込まない。
