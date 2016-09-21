from link import lnk
import requests 

QUERY = "select url from url_title where title = 'No title'"
SCRAPPER= "http://scrapper.crusher.getrockerbox.com/?url=%s"
QUERY2 = "update url_title set title= %s where url = %s"

if __name__ == "__main__":

    QUERY = "select url from url_title where title = 'No title'"
    db = lnk.dbs.crushercache

    data = db.select_dataframe(QUERY)
    for url in data.iterrows():
        try:
            requests.get(url[1]['url'])
        except:
            continue
        title_data = requests.get(SCRAPPER % url[1]['url'], auth=('rockerbox','rockerbox'))
        try:
            title = title_data.json()['result']['title']
            print title
            db.execute(QUERY2, (title, url[1]['url']))
            import time
            time.sleep(1)
        except:
            import time
            time.sleep(2)
