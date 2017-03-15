from link import lnk
import bs4
import pandas as pd
import requests
import random

ADVERTISERS = '''
SELECT * FROM rockerbox.advertiser
WHERE active =1 AND running = 1 AND media = 1
'''
    
def crawl_domains(domain_list, num = 5):
    df = pd.DataFrame()
    for domain in domain_list:
        crawled = crawl(domain, num)
        crawled['domain'] = domain
        df = pd.concat([df, crawled])
    return df
    
    
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
def crawl(url,num=10):
    try:
        page = bs4.BeautifulSoup(requests.get("http://%s" % url,headers={"User-Agent": USER_AGENT}).content)
        links = [a.get("href") for a in page.find_all("a") ]

        if len(links) == 0: 
            return pd.DataFrame([["http://%s" % url,url]],columns=["href","domain"])

        else:
            df = pd.DataFrame(links, columns = ["href"]).fillna("")

            block = ['pinterest.com','facebook.com','twitter.com','tumblr.com',
                     'plus.google.com','mailto:','addtoany','#comments','.jpg','whatsapp']

            df = df[df['href'].apply(lambda  x: (len([b for b in block if b in x]) == 0 )) ]
            df['href'] = df['href'].apply(lambda x: "http://%s%s" % (url,x) if ("http://" not in x) and x.startswith("/") else x)
            df = df[df['href'].apply(lambda x: url in x)]

            if len(df) == 0:
                return pd.DataFrame([["http://%s" % url,url]], columns=["href","domain"])
            else:
                sampled = random.sample(list(df.index),min(num, len(df)))
                df = df.ix[list(sampled),:]
                return df
    except:
        return pd.DataFrame([["http://%s" % url,url]],columns=["href","domain"])    

    
url = "http://192.168.99.100:8888/domains?advertiser=%s"


Y = YoshiDomainQueue()
advertisers = lnk.dbs.rockerbox.select_dataframe(ADVERTISERS)
for k, row in advertisers.iterrows():
    print row['external_advertiser_id']

    resp = request.get(url%row['external_advertiser_id'])
    import ipdb; ipdb.set_trace()

