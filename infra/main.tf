terraform {
  required_version = ">= 1.8"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.73"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.8"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }

  # The bucket is passed via -backend-config="bucket=..." (STATE_BUCKET in CI).
  backend "s3" {
    region       = "eu-central-1"
    use_lockfile = true
  }
}

data "aws_caller_identity" "current" {}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "opentofu"
    }
  }
}

# CloudFront and ACM certificates for CloudFront require us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "opentofu"
    }
  }
}
