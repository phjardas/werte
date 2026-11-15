data "aws_region" "current" {}

# All Lambda functions log to this group. Lambda prefixes each log stream with
# the function name, and the JSON events carry the function in `fn`.
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project}"
  retention_in_days = 30
}

# ── Metric filters ────────────────────────────────────────────────────────────

resource "aws_cloudwatch_log_metric_filter" "cache_hits" {
  name           = "${var.project}-cache-hits"
  log_group_name = aws_cloudwatch_log_group.lambda.name
  pattern        = "{ $.event = \"cache_hit\" }"

  metric_transformation {
    # dimensions and default_value are mutually exclusive in AWS; keep dimensions for per-function breakdown
    name       = "CacheHits"
    namespace  = "Werte/Scenarios"
    value      = "1"
    unit       = "Count"
    dimensions = { Function = "$.fn" }
  }
}

resource "aws_cloudwatch_log_metric_filter" "cache_misses" {
  name           = "${var.project}-cache-misses"
  log_group_name = aws_cloudwatch_log_group.lambda.name
  pattern        = "{ $.event = \"cache_miss\" }"

  metric_transformation {
    name       = "CacheMisses"
    namespace  = "Werte/Scenarios"
    value      = "1"
    unit       = "Count"
    dimensions = { Function = "$.fn" }
  }
}

resource "aws_cloudwatch_log_metric_filter" "gen_errors" {
  name           = "${var.project}-gen-errors"
  log_group_name = aws_cloudwatch_log_group.lambda.name
  pattern        = "{ $.event = \"gen_error\" }"

  metric_transformation {
    name       = "GenerationErrors"
    namespace  = "Werte/Scenarios"
    value      = "1"
    unit       = "Count"
    dimensions = { Function = "$.fn" }
  }
}

# Field-reference values ($.field) cannot be combined with dimensions, so each
# duration metric gets its own name and filters on `fn`.
resource "aws_cloudwatch_log_metric_filter" "szenario_generation_duration" {
  name           = "${var.project}-szenario-generation-duration"
  log_group_name = aws_cloudwatch_log_group.lambda.name
  pattern        = "{ $.event = \"cache_miss\" && $.fn = \"getSzenario\" }"

  metric_transformation {
    name      = "SzenarioGenerationDurationMs"
    namespace = "Werte/Scenarios"
    value     = "$.generationMs"
    unit      = "Milliseconds"
  }
}

resource "aws_cloudwatch_log_metric_filter" "zusammenfassung_generation_duration" {
  name           = "${var.project}-zusammenfassung-generation-duration"
  log_group_name = aws_cloudwatch_log_group.lambda.name
  pattern        = "{ $.event = \"cache_miss\" && $.fn = \"getZusammenfassung\" }"

  metric_transformation {
    name      = "ZusammenfassungGenerationDurationMs"
    namespace = "Werte/Scenarios"
    value     = "$.generationMs"
    unit      = "Milliseconds"
  }
}

# ── Dashboard ─────────────────────────────────────────────────────────────────

locals {
  aws_region = data.aws_region.current.region
}

resource "aws_cloudwatch_dashboard" "scenarios" {
  dashboard_name = "${var.project}-scenarios"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Cache Hit Rate %"
          view    = "timeSeries"
          stacked = false
          region  = local.aws_region
          metrics = [
            [{ expression = "100 * (m1 + m3) / (m1 + m2 + m3 + m4)", label = "Hit Rate %", id = "e1" }],
            ["Werte/Scenarios", "CacheHits", "Function", "getSzenario", { id = "m1", visible = false, stat = "Sum", region = local.aws_region }],
            ["Werte/Scenarios", "CacheMisses", "Function", "getSzenario", { id = "m2", visible = false, stat = "Sum", region = local.aws_region }],
            ["Werte/Scenarios", "CacheHits", "Function", "getZusammenfassung", { id = "m3", visible = false, stat = "Sum", region = local.aws_region }],
            ["Werte/Scenarios", "CacheMisses", "Function", "getZusammenfassung", { id = "m4", visible = false, stat = "Sum", region = local.aws_region }],
          ]
          period = 300
          stat   = "Sum"
          yAxis  = { left = { min = 0, max = 100 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Cache Hits vs Misses"
          view    = "timeSeries"
          stacked = true
          region  = local.aws_region
          metrics = [
            ["Werte/Scenarios", "CacheHits", "Function", "getSzenario", { label = "Szenario Hits" }],
            ["Werte/Scenarios", "CacheMisses", "Function", "getSzenario", { label = "Szenario Misses" }],
            ["Werte/Scenarios", "CacheHits", "Function", "getZusammenfassung", { label = "Zusammenfassung Hits" }],
            ["Werte/Scenarios", "CacheMisses", "Function", "getZusammenfassung", { label = "Zusammenfassung Misses" }],
          ]
          period = 300
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Generation Duration"
          view    = "timeSeries"
          stacked = false
          region  = local.aws_region
          metrics = [
            ["Werte/Scenarios", "SzenarioGenerationDurationMs", { label = "Szenario p50", stat = "p50" }],
            ["Werte/Scenarios", "SzenarioGenerationDurationMs", { label = "Szenario p95", stat = "p95" }],
            ["Werte/Scenarios", "ZusammenfassungGenerationDurationMs", { label = "Zusammenfassung p50", stat = "p50" }],
            ["Werte/Scenarios", "ZusammenfassungGenerationDurationMs", { label = "Zusammenfassung p95", stat = "p95" }],
          ]
          period = 300
          stat   = "p50"
          yAxis  = { left = { min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Generation Errors"
          view    = "timeSeries"
          stacked = false
          region  = local.aws_region
          metrics = [
            ["Werte/Scenarios", "GenerationErrors", "Function", "getSzenario", { label = "Szenario" }],
            ["Werte/Scenarios", "GenerationErrors", "Function", "getZusammenfassung", { label = "Zusammenfassung" }],
          ]
          period = 300
          stat   = "Sum"
          yAxis  = { left = { min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Lambda Errors"
          view    = "timeSeries"
          stacked = false
          region  = local.aws_region
          metrics = [
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.get_szenario.function_name, { label = "getSzenario" }],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.generate_test_zusammenfassung.function_name, { label = "generateTestZusammenfassung" }],
          ]
          period = 300
          stat   = "Sum"
          yAxis  = { left = { min = 0 } }
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "Lambda Duration p95"
          view    = "timeSeries"
          stacked = false
          region  = local.aws_region
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.get_szenario.function_name, { label = "getSzenario", stat = "p95" }],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.generate_test_zusammenfassung.function_name, { label = "generateTestZusammenfassung", stat = "p95" }],
          ]
          period = 300
          stat   = "p95"
          yAxis  = { left = { min = 0 } }
        }
      },
    ]
  })
}

# ── Budget ────────────────────────────────────────────────────────────────────

# Covers the whole account, Bedrock included. AWS evaluates budgets a few times per day, so this
# alert lags; the daily budget in the backend is the actual cap.
resource "aws_budgets_budget" "monat" {
  count        = var.budget_email == "" ? 0 : 1
  name         = "${var.project}-monatsbudget"
  budget_type  = "COST"
  limit_amount = tostring(var.monatsbudget_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_email]
  }
}
