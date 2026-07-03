"""Static NovaPay seed scenario: pillars, areas, indicators, weights, and the
strategy relationship map. See synaptic-strategy-handoff.md Section 9.

Strategic pillars are not named in the source spec (only departments) — this
mapping is an inferred judgment call, flagged as such per issue #5.
"""

PILLARS = [
    {"key": "revenue_growth", "name": "Revenue Growth", "description": "Growing sales volume and revenue."},
    {"key": "operational_excellence", "name": "Operational Excellence", "description": "Reliable, compliant, efficient operations."},
    {"key": "people_culture", "name": "People & Culture", "description": "Building the team that powers growth."},
]

AREAS = [
    {"key": "finance", "name": "Finance", "pillar_key": "revenue_growth"},
    {"key": "sales", "name": "Sales", "pillar_key": "revenue_growth"},
    {"key": "people", "name": "People", "pillar_key": "people_culture"},
    {"key": "governance", "name": "Governance", "pillar_key": "operational_excellence"},
    {"key": "technology", "name": "Technology", "pillar_key": "operational_excellence"},
]

# Each indicator's owning area, weight within that area's department score,
# and the inputs needed to call the scoring service. `target` is the
# baseline monthly target used to generate 24 months of results.
INDICATORS = [
    {
        "code": "FIN_REV", "name": "Total Revenue", "unit": "currency", "polarity": "higher_is_better",
        "calculation_method": "Sum of all product sales revenue for the month.",
        "composition": "Subscription revenue + transaction fees + interchange revenue.",
        "accumulation_type": "sum", "area_key": "finance", "weight": 0.40, "kpi_type": "numerical",
        "target": 12_000_000.0,
    },
    {
        "code": "FIN_OCR", "name": "Operating Cost Ratio", "unit": "percentage", "polarity": "lower_is_better",
        "calculation_method": "Operating expenses divided by total revenue.",
        "composition": "Payroll + infrastructure + marketing + G&A costs.",
        "accumulation_type": "last", "area_key": "finance", "weight": 0.30, "kpi_type": "numerical",
        "target": 62.0,
    },
    {
        "code": "FIN_EBITDA", "name": "EBITDA Margin", "unit": "percentage", "polarity": "higher_is_better",
        "calculation_method": "EBITDA divided by total revenue.",
        "composition": "Revenue minus operating expenses, excluding interest, tax, depreciation, amortization.",
        "accumulation_type": "last", "area_key": "finance", "weight": 0.20, "kpi_type": "numerical",
        "target": 18.0,
    },
    {
        "code": "FIN_ARPU", "name": "Average Revenue per User", "unit": "currency", "polarity": "higher_is_better",
        "calculation_method": "Total revenue divided by active customer base.",
        "composition": "Total Revenue / Active Customer Base.",
        "accumulation_type": "average", "area_key": "finance", "weight": 0.10, "kpi_type": "numerical",
        "target": 48.0,
    },
    {
        "code": "SALES_PSP", "name": "Sales per Salesperson", "unit": "count", "polarity": "higher_is_better",
        "calculation_method": "Total closed sales divided by number of active salespeople.",
        "composition": "New business + upsell deals closed.",
        "accumulation_type": "average", "area_key": "sales", "weight": 0.35, "kpi_type": "numerical",
        "target": 40.0,
    },
    {
        "code": "SALES_ACB", "name": "Active Customer Base", "unit": "count", "polarity": "higher_is_better",
        "calculation_method": "Count of customers with at least one transaction in the trailing 30 days.",
        "composition": "New customers + retained customers.",
        "accumulation_type": "last", "area_key": "sales", "weight": 0.30, "kpi_type": "numerical",
        "target": 15_000.0,
    },
    {
        "code": "SALES_CHURN", "name": "Churn Rate", "unit": "percentage", "polarity": "lower_is_better",
        "calculation_method": "Customers lost in the month divided by customers at start of month.",
        "composition": "Voluntary + involuntary churn.",
        "accumulation_type": "last", "area_key": "sales", "weight": 0.20, "kpi_type": "numerical",
        "target": 3.5,
    },
    {
        "code": "SALES_CONV", "name": "Conversion Rate", "unit": "percentage", "polarity": "higher_is_better",
        "calculation_method": "Leads converted to paying customers divided by total qualified leads.",
        "composition": "Qualified leads / closed-won deals.",
        "accumulation_type": "last", "area_key": "sales", "weight": 0.15, "kpi_type": "numerical",
        "target": 22.0,
    },
    {
        "code": "PEOPLE_HCG", "name": "Headcount Growth", "unit": "count", "polarity": "higher_is_better",
        "calculation_method": "Net new hires in the month.",
        "composition": "Hires minus attrition.",
        "accumulation_type": "sum", "area_key": "people", "weight": 0.40, "kpi_type": "numerical",
        "target": 8.0,
    },
    {
        "code": "PEOPLE_TURN", "name": "Turnover Rate", "unit": "percentage", "polarity": "lower_is_better",
        "calculation_method": "Employees who left divided by average headcount.",
        "composition": "Voluntary + involuntary departures.",
        "accumulation_type": "last", "area_key": "people", "weight": 0.35, "kpi_type": "numerical",
        "target": 4.0,
    },
    {
        "code": "PEOPLE_TTF", "name": "Time to Fill Open Positions", "unit": "days", "polarity": "lower_is_better",
        "calculation_method": "Median days from requisition open to offer accepted.",
        "composition": "Sourcing time + interview cycle time + offer negotiation time.",
        "accumulation_type": "average", "area_key": "people", "weight": 0.25, "kpi_type": "milestone",
        "target": 30.0,
    },
    {
        "code": "GOV_SLA", "name": "SLA Compliance", "unit": "percentage", "polarity": "higher_is_better",
        "calculation_method": "Requests resolved within SLA divided by total requests.",
        "composition": "Support + platform SLA commitments.",
        "accumulation_type": "last", "area_key": "governance", "weight": 0.40, "kpi_type": "numerical",
        "target": 98.0,
    },
    {
        "code": "GOV_REG", "name": "Regulatory Filing On-Time Rate", "unit": "percentage", "polarity": "higher_is_better",
        "calculation_method": "Regulatory filings submitted by their due date divided by total filings due.",
        "composition": "Central bank + tax authority filings.",
        "accumulation_type": "last", "area_key": "governance", "weight": 0.40, "kpi_type": "milestone",
        "target": 100.0,
    },
    {
        "code": "GOV_AUDIT", "name": "Audit Finding Resolution Time", "unit": "days", "polarity": "lower_is_better",
        "calculation_method": "Average days to remediate an audit finding.",
        "composition": "Internal + external audit findings.",
        "accumulation_type": "average", "area_key": "governance", "weight": 0.20, "kpi_type": "numerical",
        "target": 15.0,
    },
    {
        "code": "TECH_UPTIME", "name": "Platform Uptime", "unit": "percentage", "polarity": "higher_is_better",
        "calculation_method": "Minutes of platform availability divided by total minutes in the month.",
        "composition": "Core banking API + customer app availability.",
        "accumulation_type": "average", "area_key": "technology", "weight": 0.50, "kpi_type": "numerical",
        "target": 99.5,
    },
    {
        "code": "TECH_MTTR", "name": "Mean Time to Recovery", "unit": "hours", "polarity": "lower_is_better",
        "calculation_method": "Average time from incident detection to resolution.",
        "composition": "Detection time + remediation time.",
        "accumulation_type": "average", "area_key": "technology", "weight": 0.30, "kpi_type": "numerical",
        "target": 2.0,
    },
    {
        "code": "TECH_CYCLE", "name": "Feature Delivery Cycle Time", "unit": "days", "polarity": "lower_is_better",
        "calculation_method": "Average days from feature kickoff to production release.",
        "composition": "Design + build + review + release time.",
        "accumulation_type": "average", "area_key": "technology", "weight": 0.20, "kpi_type": "numerical",
        "target": 14.0,
    },
]

# 9-edge strategy relationship map (synaptic-strategy-handoff.md Section 9).
# Each entry is (source_code, target_code, relationship); related_kpis is
# stored on the source (upstream) indicator as the KPIs it causally influences.
RELATED_KPIS_EDGES = [
    ("PEOPLE_HCG", "SALES_PSP", "enables"),
    ("PEOPLE_HCG", "SALES_ACB", "enables"),
    ("SALES_CONV", "SALES_ACB", "drives"),
    ("SALES_ACB", "FIN_REV", "drives"),
    ("SALES_CHURN", "FIN_REV", "impacts"),
    ("FIN_OCR", "FIN_EBITDA", "impacts"),
    ("TECH_UPTIME", "SALES_CHURN", "impacts"),
    ("TECH_UPTIME", "FIN_REV", "impacts"),
    ("GOV_SLA", "SALES_CHURN", "impacts"),
]
