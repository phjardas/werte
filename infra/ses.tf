# SES domain identity for the result emails, with DKIM and a custom MAIL FROM domain for SPF.
# Each environment has its own domain and therefore its own identity.

locals {
  email_from         = "Werte Kompass <noreply@${var.domain}>"
  ses_mail_from_name = "mail.${var.domain}"
}

resource "aws_sesv2_email_identity" "main" {
  email_identity = var.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.main.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

resource "aws_sesv2_email_identity_mail_from_attributes" "main" {
  email_identity         = aws_sesv2_email_identity.main.email_identity
  mail_from_domain       = local.ses_mail_from_name
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "ses_mail_from_mx" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.ses_mail_from_name
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.eu-central-1.amazonses.com"]
}

resource "aws_route53_record" "ses_mail_from_spf" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.ses_mail_from_name
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# DKIM and the MAIL FROM domain both align with var.domain, so quarantine is safe.
# No rua: there is no mailbox to receive aggregate reports.
resource "aws_route53_record" "ses_dmarc" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = ["v=DMARC1; p=quarantine; adkim=r; aspf=r"]
}

resource "aws_iam_role_policy" "lambda_ses" {
  name = "${var.project}-lambda-ses"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "ses:SendEmail"
      Resource = aws_sesv2_email_identity.main.arn
    }]
  })
}
