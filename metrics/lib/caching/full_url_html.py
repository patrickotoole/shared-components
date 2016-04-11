from link import lnk
import bs4
from readability.readability import Document
import requests

INSERTQUERY = "insert into full_url_summary (url, summary, title) values ('{}', '{}', '{}')"
REPLACEQUERY = "replace into full_url_summary (url, summary, title) values ('{}', '{}', '{}')"

def checkURL(url):
    results= {}
    results['url'] = url
    headrs = {'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36'}
    try:
        if url.find('http') ==-1:
            url = "http://{}".format(url)
        r = requests.get(url, headers=headrs)
        current_html = r.text
        results['title'] = Document(current_html).title()
        soup = bs4.BeautifulSoup(current_html, 'html.parser')  
        meta = soup.find_all('meta')
        for t in meta:
            if 'name' in t.attrs.keys():
                if t['name'] == "description":
                    results['summary'] = t.attrs['content']
        if 'summary' not in results.keys():
            doc_html = Document(current_html).summary()
            soup = bs4.BeautifulSoup(doc_html, 'html.parser')
            result_stripped = soup.html.string
            results['summary'] = result_stripped
        return results
    except:
        return {}

def getTopFull(advertiser, pattern):
    crusher = lnk.api.crusher
    crusher.user = "a_{}".format(advertiser)
    crusher.password= "admin"
    crusher.base_url = 'http://192.168.99.100:8888'
    crusher.authenticate()
    results = crusher.get('/crusher/v1/visitor/domains_full/cache?format=json&url_pattern={}'.format(pattern))
    datajs = results.json
    final_results = []
    for i in datajs[:250]:
        if i['url']!=' ' and i['url']!='':
            final_results.append(i['url'])
    return final_results
 

def insert(data, db):
    if type(data['summary']) == type(None):
        data['summary'] = str(data['summary'])
    summary =data['summary'].replace("'","").encode('utf-8')
    try:
        db.execute(INSERTQUERY.format(data['url'], summary, data['title'].encode('utf-8').replace("'","")))
    except:
        db.execute(REPLACEQUERY.format(data['url'], summary, data['title'].encode('utf-8').replace("'","")))

segments = getTopFull('fsastore', '/')
db = lnk.dbs.crushercache
for url in segments:
    print url
    data = checkURL(url)
    if data != {}:
        insert(data, db)
        print data
