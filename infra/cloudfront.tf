resource "aws_s3_bucket" "static" {
  bucket        = "${var.project}-static-${data.aws_caller_identity.current.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "static" {
  bucket                  = aws_s3_bucket.static.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "static" {
  name                              = "${var.project}-static"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "static" {
  bucket = aws_s3_bucket.static.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFront"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.static.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

# Shared secret CloudFront sends to API Gateway, so the Lambdas can reject requests that bypass
# CloudFront and its WAF (see nurUeberCloudFront in backend/src/lambdas/response.ts).
resource "random_password" "origin_secret" {
  length  = 48
  special = false
}

locals {
  s3_origin_id    = "s3-static"
  apigw_origin_id = "api-gateway"
  apigw_domain    = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain]
  price_class         = "PriceClass_100"
  comment             = var.project

  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.static.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.static.id
  }

  origin {
    origin_id   = local.apigw_origin_id
    domain_name = local.apigw_domain

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "x-origin-verify"
      value = random_password.origin_secret.result
    }
  }

  # Default: React SPA. Client-side routes have no S3 object, S3 answers 403 (the bucket policy
  # grants no s3:ListBucket) and the custom error response below serves /index.html instead.
  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    # CachingOptimized managed policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # /assets/* — Vite hashed bundles, long cache
  ordered_cache_behavior {
    path_pattern           = "/assets/*"
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    # CachingOptimized managed policy
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # /api/* — API Gateway. The routes carry the /api prefix themselves, so no rewrite is needed.
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = local.apigw_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    # CachingDisabled managed policy
    cache_policy_id = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    # AllViewerExceptHostHeader — don't forward Host to API GW
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.main.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  # Error responses apply to every origin. The API therefore must never answer 403 to a request that
  # came through CloudFront, and there is deliberately no rule for 404, which the API uses for unknown tests.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  # The free flat-rate plan (subscribed in the console, see README) attaches its own web ACL, which
  # must not be removed while the plan is active, and drops the price class. Free and Pro also allow
  # only AWS managed response headers policies, so the CSP is a meta tag (app/vite.config.ts).
  lifecycle {
    ignore_changes = [web_acl_id, price_class]
  }

  depends_on = [aws_acm_certificate_validation.main]
}

output "url" {
  value = "https://${var.domain}/"
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  value = aws_s3_bucket.static.bucket
}
