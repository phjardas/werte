resource "aws_apigatewayv2_api" "main" {
  name          = var.project
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT"]
    allow_headers = ["content-type"]
    max_age       = 3600
  }
}

# Throttling applies to all clients together, not per IP. It caps request bursts; the hard cap on
# Bedrock spend is the daily budget in the backend, per-IP limits come from the CloudFront plan's WAF.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 20
    throttling_burst_limit = 50
  }

  # Each new test can lead to a summary and an email, so these routes get tighter limits.
  dynamic "route_settings" {
    for_each = {
      (aws_apigatewayv2_route.create_test.route_key)   = { rate = 2, burst = 5 }
      (aws_apigatewayv2_route.complete_test.route_key) = { rate = 2, burst = 5 }
      (aws_apigatewayv2_route.send_email.route_key)    = { rate = 1, burst = 2 }
    }
    content {
      route_key              = route_settings.key
      throttling_rate_limit  = route_settings.value.rate
      throttling_burst_limit = route_settings.value.burst
    }
  }
}

# getWerte integration + route

resource "aws_apigatewayv2_integration" "get_werte" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_werte.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_werte" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/werte"
  target    = "integrations/${aws_apigatewayv2_integration.get_werte.id}"
}

resource "aws_lambda_permission" "get_werte" {
  function_name = aws_lambda_function.get_werte.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# getSzenario integration + route

resource "aws_apigatewayv2_integration" "get_szenario" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_szenario.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_szenario" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/szenarien/{wert1}/{wert2}"
  target    = "integrations/${aws_apigatewayv2_integration.get_szenario.id}"
}

resource "aws_lambda_permission" "get_szenario" {
  function_name = aws_lambda_function.get_szenario.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# voteSzenario integration + route

resource "aws_apigatewayv2_integration" "vote_szenario" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.vote_szenario.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "vote_szenario" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/szenarien/{wert1}/{wert2}/vote"
  target    = "integrations/${aws_apigatewayv2_integration.vote_szenario.id}"
}

resource "aws_lambda_permission" "vote_szenario" {
  function_name = aws_lambda_function.vote_szenario.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}


# createTest integration + route

resource "aws_apigatewayv2_integration" "create_test" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.create_test.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "create_test" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/tests"
  target    = "integrations/${aws_apigatewayv2_integration.create_test.id}"
}

resource "aws_lambda_permission" "create_test" {
  function_name = aws_lambda_function.create_test.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# getTest integration + route

resource "aws_apigatewayv2_integration" "get_test" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_test.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_test" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/tests/{testId}"
  target    = "integrations/${aws_apigatewayv2_integration.get_test.id}"
}

resource "aws_lambda_permission" "get_test" {
  function_name = aws_lambda_function.get_test.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# updateTestState integration + route

resource "aws_apigatewayv2_integration" "update_test_state" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.update_test_state.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "update_test_state" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "PUT /api/tests/{testId}/state"
  target    = "integrations/${aws_apigatewayv2_integration.update_test_state.id}"
}

resource "aws_lambda_permission" "update_test_state" {
  function_name = aws_lambda_function.update_test_state.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# completeTest integration + route

resource "aws_apigatewayv2_integration" "complete_test" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.complete_test.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "complete_test" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/tests/{testId}/complete"
  target    = "integrations/${aws_apigatewayv2_integration.complete_test.id}"
}

resource "aws_lambda_permission" "complete_test" {
  function_name = aws_lambda_function.complete_test.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# sendEmail integration + route

resource "aws_apigatewayv2_integration" "send_email" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.send_email.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "send_email" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /api/tests/{testId}/email"
  target    = "integrations/${aws_apigatewayv2_integration.send_email.id}"
}

resource "aws_lambda_permission" "send_email" {
  function_name = aws_lambda_function.send_email.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# getStatistik integration + route

resource "aws_apigatewayv2_integration" "get_statistik" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_statistik.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_statistik" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /api/statistik"
  target    = "integrations/${aws_apigatewayv2_integration.get_statistik.id}"
}

resource "aws_lambda_permission" "get_statistik" {
  function_name = aws_lambda_function.get_statistik.function_name
  action        = "lambda:InvokeFunction"
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
