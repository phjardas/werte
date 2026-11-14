# Emails are sent from philipp@jardas.de. The SES identity for jardas.de (including DKIM) already
# exists in the account and is managed outside this project, so it is only referenced here.

locals {
  email_from       = "Philipp Jardas <philipp@jardas.de>"
  ses_identity_arn = "arn:aws:ses:eu-central-1:${data.aws_caller_identity.current.account_id}:identity/jardas.de"
}

resource "aws_iam_role_policy" "lambda_ses" {
  name = "${var.project}-lambda-ses"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "ses:SendEmail"
      Resource = local.ses_identity_arn
    }]
  })
}
