variable "project" {
  type    = string
  default = "werte"
}

variable "domain" {
  type    = string
  default = "werte.jardas.de"
}

variable "zone_id" {
  type = string
}

# Hard cap on the gross Bedrock cost per UTC day. Once reached, scenarios that are not cached and
# new summaries fail until midnight UTC.
variable "tagesbudget_usd" {
  type    = number
  default = 10
}

# Address for the monthly AWS Budgets alert. Budgets are per account, so set it for one environment
# only (production). Empty disables the alert.
variable "budget_email" {
  type    = string
  default = ""
}

variable "monatsbudget_usd" {
  type    = number
  default = 30
}
