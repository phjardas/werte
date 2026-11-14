data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name = "${var.project}-lambda-dynamodb"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.szenarien.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_tests_dynamodb" {
  name = "${var.project}-lambda-tests-dynamodb"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
        Resource = aws_dynamodb_table.tests.arn
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "${var.project}-lambda-bedrock"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["bedrock:InvokeModel"]
        Resource = [
          "arn:aws:bedrock:*::foundation-model/anthropic.*",
          "arn:aws:bedrock:eu-central-1:${data.aws_caller_identity.current.account_id}:inference-profile/eu.anthropic.*"
        ]
      }
    ]
  })
}

# All Lambda functions are packaged into a single zip

data "archive_file" "functions" {
  type        = "zip"
  source_dir  = "${path.module}/../backend/dist"
  output_path = "${path.module}/.build/functions.zip"
}

# getWerte

resource "aws_lambda_function" "get_werte" {
  function_name    = "${var.project}-getWerte"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/getWerte.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 10
  memory_size      = 128
}

# getSzenario

resource "aws_lambda_function" "get_szenario" {
  function_name    = "${var.project}-getSzenario"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/getSzenario.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.szenarien.name
    }
  }

  logging_config {
    log_group  = aws_cloudwatch_log_group.get_szenario.name
    log_format = "Text"
  }
}

# createTest

resource "aws_lambda_function" "create_test" {
  function_name    = "${var.project}-createTest"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/createTest.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.tests.name
    }
  }
}

# getTest

resource "aws_lambda_function" "get_test" {
  function_name    = "${var.project}-getTest"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/getTest.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE                         = aws_dynamodb_table.tests.name
      GENERATE_ZUSAMMENFASSUNG_FUNCTION_NAME = aws_lambda_function.generate_test_zusammenfassung.function_name
    }
  }
}

# updateTestState

resource "aws_lambda_function" "update_test_state" {
  function_name    = "${var.project}-updateTestState"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/updateTestState.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 15
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE        = aws_dynamodb_table.tests.name
      PREWARM_FUNCTION_NAME = aws_lambda_function.prewarm_szenarien.function_name
    }
  }
}

resource "aws_iam_role_policy" "lambda_invoke_prewarm" {
  name = "${var.project}-lambda-invoke-prewarm"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["lambda:InvokeFunction"]
        Resource = [
          aws_lambda_function.prewarm_szenarien.arn,
          aws_lambda_function.generate_test_zusammenfassung.arn,
        ]
      }
    ]
  })
}

# completeTest

resource "aws_lambda_function" "complete_test" {
  function_name    = "${var.project}-completeTest"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/completeTest.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE    = aws_dynamodb_table.tests.name
      STEP_FUNCTION_ARN = aws_sfn_state_machine.post_test.arn
    }
  }
}

# generateTestZusammenfassung (Step Function task)

resource "aws_lambda_function" "generate_test_zusammenfassung" {
  function_name    = "${var.project}-generateTestZusammenfassung"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/generateTestZusammenfassung.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 120
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.szenarien.name
      TESTS_TABLE    = aws_dynamodb_table.tests.name
    }
  }
}

# voteSzenario

resource "aws_lambda_function" "vote_szenario" {
  function_name    = "${var.project}-voteSzenario"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/voteSzenario.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.szenarien.name
    }
  }
}

# prewarmSzenarien

resource "aws_lambda_function" "prewarm_szenarien" {
  function_name    = "${var.project}-prewarmSzenarien"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/prewarmSzenarien.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 90
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.szenarien.name
      TESTS_TABLE    = aws_dynamodb_table.tests.name
    }
  }
}

# getZusammenfassung

resource "aws_lambda_function" "get_zusammenfassung" {
  function_name    = "${var.project}-getZusammenfassung"
  role             = aws_iam_role.lambda.arn
  handler          = "lambdas/getZusammenfassung.handler"
  runtime          = "nodejs26.x"
  architectures    = ["arm64"]
  filename         = data.archive_file.functions.output_path
  source_code_hash = data.archive_file.functions.output_base64sha256
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.szenarien.name
    }
  }

  logging_config {
    log_group  = aws_cloudwatch_log_group.get_zusammenfassung.name
    log_format = "Text"
  }
}
