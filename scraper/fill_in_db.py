from link import lnk
import requests

QUERY = "select url from url_title where title = ''"
INSERTQUERY = "update url_title set title=%s where url=%s"
#SCRAPPER = "http://slave%s/read?url=%s"
SCRAPPER = "http://192.168.99.100:%s/read?url=%s"

if __name__ == "__main__":

    db = lnk.dbs.crushercache
    urls = db.select_dataframe(QUERY)
    for url in urls.iterrows():
        single_url = url[1]['url']
        try:
            resp = requests.get(SCRAPPER % (8888,single_url))
            if resp.json()['result']['title'] != "":
                db.execute(INSERTQUERY, (resp.json()['result']['title'],url[1]['url']))
        except Exception as e:
            print(str(e))

