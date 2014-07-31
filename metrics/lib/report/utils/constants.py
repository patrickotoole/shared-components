"media cost under this amount is truncated"
THRESHOLD = 7

"metrics"
WORST = 'worst'
BEST = 'best'

NUM_TRIES = 10
LIMIT = 10
SLEEP = 1

"ndigit to round"
NDIGITS = 2

"set it to avoid, no division error or Inf values"
DAMPING_POINT = 0.

"value of inf cpas should be"
CPA_INF = 0

MILLION = 1000000
NO_CONVS = None

TYPE = 'network_analytics'
CONSOLE = None

COST_EFFICIENCY = 'cost_efficiency'
DOMAIN = 'site_domain'
DATA_PULL = 'datapulling'
CONVERSIONS = 'converstions'
GOOGLE_ADX = 'Google AdExchange (181)'
BOOKED_REV = 'booked_revenue'
PC_CONVS = 'post_click_convs'
PV_CONVS = 'post_view_convs'
POST_CLICK = 'Post Click'
MEDIA_COST = 'media_cost'
PC_EXPIRE = 'post_click_expire_mins'
PV_EXPIRE = 'post_view_expire_mins'
CPA = 'cpa'
HEADERS = [
        MEDIA_COST,
        CPA,
        ]

GROUPS = [
    'site_domain',
    'campaign',
    'advertiser',
 ]

ADVERTISER_IDS = map(str, [185711,195681,225133,250058,251793,272759,274802,285817,302568,306383,306401,309251,312933,319800,338195,349923,356780])
