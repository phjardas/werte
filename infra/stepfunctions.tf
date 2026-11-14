data "aws_iam_policy_document" "step_functions_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "step_functions" {
  name               = "${var.project}-step-functions"
  assume_role_policy = data.aws_iam_policy_document.step_functions_assume.json
}

resource "aws_iam_role_policy" "step_functions_invoke_lambda" {
  name = "${var.project}-step-functions-invoke-lambda"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = "lambda:InvokeFunction"
      Resource = [
        aws_lambda_function.generate_test_zusammenfassung.arn,
      ]
    }]
  })
}

resource "aws_iam_role_policy" "step_functions_dynamodb" {
  name = "${var.project}-step-functions-dynamodb"
  role = aws_iam_role.step_functions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "dynamodb:UpdateItem"
      Resource = aws_dynamodb_table.tests.arn
    }]
  })
}

resource "aws_sfn_state_machine" "post_test" {
  name     = "${var.project}-postTest"
  role_arn = aws_iam_role.step_functions.arn

  definition = jsonencode({
    Comment = "Post-test processing: generate summary"
    StartAt = "GenerateZusammenfassung"
    States = {
      GenerateZusammenfassung = {
        Type     = "Task"
        Resource = aws_lambda_function.generate_test_zusammenfassung.arn
        Retry = [{
          ErrorEquals     = ["States.TaskFailed"]
          IntervalSeconds = 5
          MaxAttempts     = 3
          BackoffRate     = 2
        }]
        Catch = [{
          ErrorEquals = ["States.ALL"]
          Next        = "SetZusammenfassungFailed"
          ResultPath  = "$.error"
        }]
        End = true
      }
      SetZusammenfassungFailed = {
        Type     = "Task"
        Resource = "arn:aws:states:::dynamodb:updateItem"
        Parameters = {
          TableName = aws_dynamodb_table.tests.name
          Key = {
            testId = { "S.$" = "$.testId" }
          }
          UpdateExpression = "SET zusammenfassungStatus = :failed"
          ExpressionAttributeValues = {
            ":failed" = { S = "failed" }
          }
        }
        ResultPath = null
        End        = true
      }
    }
  })
}

resource "aws_iam_role_policy" "lambda_sfn" {
  name = "${var.project}-lambda-sfn"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "states:StartExecution"
      Resource = aws_sfn_state_machine.post_test.arn
    }]
  })
}
