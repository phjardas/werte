resource "aws_dynamodb_table" "szenarien" {
  name         = "${var.project}-szenarien"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "version"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "version"
    type = "S"
  }
}

resource "aws_dynamodb_table" "tests" {
  name         = "${var.project}-tests"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "testId"

  attribute {
    name = "testId"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}
