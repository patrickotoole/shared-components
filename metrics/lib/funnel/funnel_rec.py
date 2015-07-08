import fnmatch
import pandas as pd
from funnel_lib import Tree, FunnelMongoAPI, FunnelAPI

from urlparse import urlparse
import re

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

api = FunnelAPI()

ADVERTISER = "bigstock"
TYPE = "urls"

conv_actions = {
    "baublebar": [
        "https://www.baublebar.com/checkout/onepage/",
        "https://www.baublebar.com/checkout/onepage/index/",
        "https://www.baublebar.com/checkout/onepage/success/",
        "https://www.baublebar.com/paypal/express/review/",
        "https://www.baublebar.com/paypal/express/review/"
    ],
    "littlebits": [
        "https://littlebits.cc/checkout/registration",
        "http://littlebits.cc/checkout/confirmation",
        "https://littlebits.cc/checkout",
        "https://littlebits.cc/checkout/address"
    ],
    "journelle": [
        "https://www.journelle.com/on/demandware.store/Sites-journelle-Site/default/COShipping-Start",
        "https://www.journelle.com/on/demandware.store/Sites-journelle-Site/default/COSummary-Submit",
        "https://www.journelle.com/on/demandware.store/Sites-journelle-Site/default/COBilling-Start"
    ],
    "bigstock": [
        "http://www.bigstockphoto.com/subscribe/payment*",
        "http://www.bigstockphoto.com/ru/subscribe/payment*",
        "http://www.bigstockphoto.com/account/commissions*",
        "http://www.bigstockphoto.com/account/uploads*"
    ]
}

excludes = {
    "baublebar": [
        "http://www.baublebar.com/checkout/cart/",
        "https://www.baublebar.com/checkout/cart/",
        "https://www.baublebar.com/customer/account/",
        "https://www.baublebar.com/customer/account/logoutSuccess/",
        "https://www.baublebar.com/rewards/customer/",
        "http://www.baublebar.com/",
        "https://www.baublebar.com/customer/account/create/referer/*",
        "https://www.baublebar.com/customer/account/create/?referer*",
        "https://www.baublebar.com/customer/account/index/",
        "https://www.baublebar.com/customer/account/forgotpassword/",
        "https://www.baublebar.com/customer/account/login/",
        "https://www.baublebar.com/customer/account/login/referer*"
    ],
    "littlebits": [
        "http://littlebits.cc/shop",
        "http://littlebits.cc/cart"
    ],
    "journelle": [
        "https://www.journelle.com/on/demandware.store/Sites-journelle-Site/default/Cart-Show",
        "https://www.journelle.com/my-account",
        "https://www.journelle.com/on/demandware.store/Sites-journelle-Site/default/Order-History",
        "http://www.journelle.com/",
        "https://www.journelle.com/",
        "https://www.journelle.com/on/demandware.store/Sites-journelle-Site/default/Account-SetNewPasswordConfirm"
    ],
    "bigstock": []
}

STOPWORDS = [
    "http",
    "",
    "www",
    "html",
    "content",
    "topic",
    "page",
    "google",
    "onepage",
    "utm",
    "medium",
    "htmlutm",
    "email",
    "source",
    "all",
    "view",
    "mxl",
    "xml",
    "vbm",
    "circ"
]

def filter_keywords(words, stopwords):
    words = [w for w in words if w not in stopwords and len(w) > 2]
    return words

def url_to_keywords(url, stopwords=STOPWORDS):
    parsed = urlparse(url)
    u = parsed.path + parsed.params + parsed.query
    
    words = re.split(r"[^a-z]", u)
    words = filter_keywords(words, stopwords)
    return words

def urls_to_keywords(urls):
    keyword_lists = [url_to_keywords(u) for u in urls]
    keywords = [k for sublist in keyword_lists for k in sublist]
    keywords = list(set(keywords))
    return keywords

def matches_any(l, regex_list):
    for s in l:
        if matches(s, regex_list):
            return True
    return False

def matches(s, regex_list):
    for regex in regex_list:
        if fnmatch.fnmatch(s, regex):
            return True
    return False

# Get top N urls and their uids
N = 900
urls = api.get_urls(ADVERTISER, visits=True).sort("visits").tail(N).url.tolist()

url_dict = {}
uid_dict = {}

# Dictionary of url -> List(uids)
for url in urls:
    logging.info(url)
    url_dict[url] = api.fetch_uids([url])

# Dictionary of uid -> List(urls)
for url, uids in url_dict.items():
    for uid in uids:
        if uid not in uid_dict:
            uid_dict[uid] = []
        uid_dict[uid].append(url)

# Convert dictionary to DataFrame
df = pd.DataFrame({"urls":pd.Series(uid_dict.values())})

# Remove large dictionaries to save memory
del url_dict
del uid_dict

# Put DataFrame into correct format for Tree object, remove users with less 
df["converted"] = df.urls.apply(lambda x: '1' if matches_any(x, conv_actions[ADVERTISER]) else '0' )
df.urls = df.urls.apply(lambda x: [i for i in x if not matches(i, (conv_actions[ADVERTISER] + excludes[ADVERTISER]))])
df = df[df.urls.apply(lambda x: len(x) > 1)]

if TYPE == "keywords":
    df["keywords"] = df.urls.apply(urls_to_keywords)

tree = Tree(df, TYPE, "converted", make_branches=False, min_samples=10, 
            max_depth=5, num_features=500, export_path="onsite.pdf")

# We have the recomendations in a list of lists
# Next, we need to get this into the API
