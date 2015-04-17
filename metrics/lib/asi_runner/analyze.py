"""
helper functions that convert bid-reponse html to df

3 different bid-responses sample:

Auction 2347634219965901365 result: SOLD
	Winning bid gross price: $0.0002
	Winning bid net price: 0.0002, biased price: 0.0002
	Soft floor: $5.134
	Bid minimum price: $0.0000 (net minimum price: $0.0000)
	Second net price: $0.0002
	Net winning price: $0.000
	Gross winning price: $0.000
	Bidder 2 Member 2599 creative 18983159 has the highest net bid: $0.000

Auction 8521052081626573507 result: SOLD
	Winning bid gross price: $11.8789
	Winning bid net price: 10.3311, biased price: 10.3311
	Soft floor: $5.000
	Second net price: $5.0000
	Net winning price: $5.000
	Gross winning price: $5.749
	Bidder 2 Member 1947 creative 18433507 has the highest net bid: $5.000
	Deal transacted: 8757

Auction 4749760220392921580 result: SOLD
	Winning bid gross price: $0.0005
	Winning bid net price: 0.0004, biased price: 0.0004
	Soft floor: $5.134
	Second bid (modified by 0.0%, $0.0000 CPM, inverse-modified by 0.0%, $0.0000 CPM): $0.010
	Second net price: $0.0004
	3rd party price reduction expected, using first price.
	Net winning price: $0.000
	Gross winning price: $0.001
	Bidder 2 Member 2152 creative 17086507 has the highest net bid: $0.000
"""

import re
import logging
from StringIO import StringIO
import pandas

H3 = r'<h3>(RTB member.*?)</h3>(?:<p>.*?</p>)?'
H2 = r'<h2>(.*?)</h2>'

"all the infomation is in table, we are using this regex to grab all of them"
TABLE_REGEX_BASE = '(?:\n|.)*?(<table(?:\n|.)*?>(?:\n|.)*?</table>)'
"conversion information about the user"
CONV_REGEX = "Pixel (\d+).*?\n.*?(\d+).*?\n\s+(.*?) auction.*?:.*?(\d+).*?\n.*?(\d+)"
"auction summary at the bottom page"
AUCTION_SUMMARY_REGEX = re.compile("Auction\s+(\d+)\s+result:\s+(.*?)\n\t((?:.|\n\t|\n\s+)*)\n")
"wrong size error msg"
WRONG_SIZE_REGEX = re.compile("Failed - Creative (\d+) .*? doesn't match tag sizes")

FREQUENCY_REGEX = "(?:(?:Advertiser (\d+))|(?:Campaign (\d+))|(?:Campaign Group (\d+))|(?:Creative (\d+))): (\d+) .*?, (\d+) .*?, (\d+) .*?, (\d+).*?\n"
FREQUENCY_COLS = ["advertiser","campaign","lineitem","creative","session","day","lifetime","last_imp"]

"determine whether we bidded; sample: 'chose cr 17397531 for $3.000 ($3.000 net)'"
BID_PRICE_REGEX = re.compile(r'chose cr .*?\(\$(.*) net\)')
CREATIVE_REGEX = re.compile(r'chose cr (.*?) .*\(\$.* net\)') 

FLOAT_REGEX = re.compile(r'[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?')
FLOOR_REGEX = re.compile(r'(?i)(?:Hard|Soft) floor')

"our net bid price percentage, appnexus cut 16%"
PECENTAGE = 0.8396666666666667
OUR_MEMBER_ID = 2024

def _clean(details):
    """
    get rid of those:
    "Bid minimum price: $0.0000 (net minimum price: $0.0000)"
    "Second bid (modified by 0.0%, $0.0000 CPM, inverse-modified by 0.0%, # $0.0000 CPM): $0.010"
    "3rd party price reduction expected, using first price."
    """
    details = re.sub('.*?(\(.*?\)|3rd).*?\n', '', details)
    return details

def summarize_bidding(content, campaign_id):
    """
    :content: str
    :campaign_id: int
    :return: dict
    """
    summarized = _summarize_bidding(content)
    df = _analyze(content, campaign_id=campaign_id) 
    our_bid = _get_our_bid(df)
    our_creative = _get_our_creative(df) 
    bidded = True if our_bid.get('bid_price') else False
    bid_result = ('M' if not bidded else
                  'W' if (int(summarized.get('winning_member_id')) == int(OUR_MEMBER_ID)) and (our_creative == int(summarized.get('creative_id'))) else
                  'L')
    summarized.update(our_bid)
    summarized['our_creative'] = our_creative
    summarized['bid_result'] = bid_result
    return summarized

def _wrong_size(resp):
    return WRONG_SIZE_REGEX.search(resp)

def _summarize_bidding(resp):
    """
    @param resp : html response
    @return     : dict(auctioninfo)
    """
    m = AUCTION_SUMMARY_REGEX.search(resp)
    if not m:
        logging.warning("summarize bidding failed for :%s" % resp[-500:])
        return {'wrong_size': True} if _wrong_size(resp[-500:]) else {}
    auction_id, status, details = m.groups()
    details = _clean(details)
    keys = _get_summary_keys(details)
    values = FLOAT_REGEX.findall(details)
    try:
        # deal_transacted field wont always be there.
        assert(len(keys) - len(values) <= 1)
    except AssertionError:
        logging.warning("keys(%s) and values(%s) dont match: %s | %s, details:%s" % (
            len(keys), len(values), keys, values, details))
        return {}

    summarized = dict(zip(keys, values))
    summarized['status'] = status
    summarized['auction_id'] = auction_id
    return summarized

def _get_summary_keys(detail):
    m = FLOOR_REGEX.search(detail)
    if m:
        floor = [m.group().lower()]
    else:
        logging.info("Can't find floor in: %s" % detail)
        floor = []
    front = ["gross_bid",
             "winning_bid", "biased_bid",
             ]
    back = ["second_net_price",
            "net_winning_price",
            "gross_wining_price",
            "bidder_id", "winning_member_id", "creative_id", "highest_net_bid",
            "deal_transacted",
            ]
    keys = front + floor + back
    return keys

def _get_our_bid(df):
    res = {} if df.empty else df.irow(0).to_dict()
    if not res:
        return {}
    #original keys|column are "Pri, Adv, LI, Camp, Detail, Result"
    res = dict((k.lower(), v) for k, v in res.iteritems())
    m = BID_PRICE_REGEX.search(res.get('result'))
    bid_price = None if not m else float(m.group(1))*PECENTAGE
    res['bid_price'] = bid_price
    return res

def _get_our_creative(df):
    res = {} if df.empty else df.irow(0).to_dict()
    if not res:
        return {}
    #original keys|column are "Pri, Adv, LI, Camp, Detail, Result"
    res = dict((k.lower(), v) for k, v in res.iteritems())
    m = CREATIVE_REGEX.search(res.get('result'))
    our_creative = None if not m else int(m.group(1))
    return our_creative
 

def _analyze(resp, campaign_id=None, member_id=2024):
    df = _get_member(member_id, resp)
    #logging.info("Got %s rows DataFrame" % len(df))
    if not campaign_id:
        return df
    if df.empty:
        logging.info("Unable to find member: %s" % member_id)
        return df
    df = df[df['Camp'].map(str) == str(campaign_id)]
    if df.empty:
        logging.warning("Didn't find campaign_id: %s in bid-response" % campaign_id)
    return df.fillna("")

def _get_member(member_id, resp):
    """
    @param member_id: int
    Getting specific result by a member(id)
    """
    member_regex = r'<h3>RTB member.*?\(%s\)</h3>(?:<p>.*?</p>)?%s'
    member_regex = member_regex % (member_id, TABLE_REGEX_BASE)
    match = re.compile(member_regex).search(resp)
    if not match:
        logging.warning("Unable to get member: %s using regex: %s" % (member_id, member_regex))
        return pandas.DataFrame()
    html = match.group(1)
    try:
        return _read_html(html)
    except Exception as e:
        logging.warning("Error when converting html to dataframe. %s" % str(e))
        return pandas.DataFrame()

def _table_regex(head_regex):
    """
    @param head_regex : str
    @return           : regex compiled
    """
    regex = '%s%s' % (head_regex, TABLE_REGEX_BASE)
    return re.compile(regex)

def _get_table_by_regex(regex, table_name, resp):
    """
    @param regex : regex compiled
    @param name  : str(tablename)
    @param resp  : html
    @return      : dict(table_name, html)
    """
    try:
        html = regex.search(resp).group()
        return dict(table_name=table_name, html=html)
    except Exception as e:
        logging.info(str(e))
        return dict()

def _get_all_headers(resp):
    headers = []
    regex = [
            re.compile('(?:%s)' % H2),
            #<h3>RTB member Kitara Media (88)</h3>
            #<h3>Non-Audience Targeting Campaigns</h3>
            re.compile('(?:%s)' % H3)
            ]
    for r in regex:
        headers.extend(_get_header(r, resp))
    return headers

def _get_header(regex, resp):
    return [{"name": m.group(1),
             "regex": re.escape(m.group()),
             } for m in regex.finditer(resp)]

def _get_htmls_dict(resp):
    """
    @param resp: string
    @return    : dict(table_name, html)
    """
    htmls = []
    headers = _get_all_headers(resp)
    logging.info("Got potential table headers: %s" % [h.get('name') for h in headers])
    for header in headers:
        header_regex = header.get('regex')
        regex = _table_regex(header_regex)
        res = _get_table_by_regex(regex, header.get('name'), resp)
        if not res:
            logging.info("Unable to get table: %s" % header.get('name'))
        htmls.append(res)
    return htmls

def _htmls_to_df(htmls):
    """
    @param htmls : list(dict(table_name, str(html)))
    @return      : dict(table_name, dataframe)
    """
    htmls = filter(None, htmls)
    logging.info("Parsed tables : %s" % [h.get('table_name') for h in htmls])
    dict_ = dict((h.get('table_name'), _read_html(h.get('html'))) for h in htmls)
    return dict((k, v) for k, v in dict_.iteritems() if len(v) > 0)

def _read_html(html):
    return pandas.read_html(StringIO(html), header=0)[0]

def _get_dfs(resp):
    htmls_d = _get_htmls_dict(resp)
    dfs = _htmls_to_df(htmls_d)
    logging.info("Got dataframe for table: %s" % dfs.keys())
    return dfs

def _get_conversion(resp):
    conversion = pandas.DataFrame(
        re.findall(CONV_REGEX, resp),
        columns=["pixel","campaign","pc/pv","since","until"]
    )
    return conversion

def _get_conversion_summary(conversion):
    return conversion.groupby("pc/pv")["pc/pv"].count()

def _get_frequency(resp):
    frequency = pandas.DataFrame(
            re.findall(FREQUENCY_REGEX, resp),
            columns=FREQUENCY_COLS,
        ).applymap(lambda x: int(x) if x != '' else '')
    return frequency

def _get_frequency_summary(freq):
    frequency_summary = freq[["session","day","lifetime"]].sum()
    frequency_summary['count'] = len(freq)
    return frequency_summary
