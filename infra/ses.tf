# SES domain identity for the result emails, with DKIM and a custom MAIL FROM domain for SPF.
#
# Emails are sent from philipp@jardas.de, so the identity is jardas.de itself. Preview and
# production share one AWS account, and an SES identity exists only once per account and region.
# The preview stack owns it because it is always deployed (every push to main); production only
# references it. Destroying the preview stack would therefore break sending in production.

locals {
  email_domain       = "jardas.de"
  email_from         = "Philipp Jardas <philipp@${local.email_domain}>"
  manage_ses_domain  = var.project == "werte-preview"
  ses_identity_arn   = "arn:aws:ses:eu-central-1:${data.aws_caller_identity.current.account_id}:identity/${local.email_domain}"
  ses_mail_from_name = "mail.${local.email_domain}"
}

resource "aws_sesv2_email_identity" "main" {
  count          = local.manage_ses_domain ? 1 : 0
  email_identity = local.email_domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = local.manage_ses_domain ? 3 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.main[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${local.email_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.main[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_sesv2_email_identity_mail_from_attributes" "main" {
  count                  = local.manage_ses_domain ? 1 : 0
  email_identity         = aws_sesv2_email_identity.main[0].email_identity
  mail_from_domain       = local.ses_mail_from_name
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  count   = local.manage_ses_domain ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.ses_mail_from_name
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-central-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  count   = local.manage_ses_domain ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.ses_mail_from_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
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
