import pandas
import ujson


QUERY = "select full_url from prototype.offsite"
BASEINSERT = "update prototype.offsite set url_sentence = '%s' where full_url = '%s'"


class PopulateSentence():

    def __init__(self,prototype):
        self.prototype = prototype


    def parse_url(self, url):
        url = url['full_url']
        suburl = url[url.find("."):]
        suburl_after = suburl[suburl.find("/"):]
        sent = suburl_after.replace("_","|").replace("-","|").replace("/","|").replace(" ","|")
        sentence = " ".join(sent.split("|"))
        return sentence

    def insert_sentence(self, sentence, url):
        self.prototype.execute(BASEINSERT % (sentence,url['full_url']))
        import time
        time.sleep(0.1)

    def run(self):
        data = self.prototype.select_dataframe(QUERY)
        sentences = []
        for i, url in data.iterrows():
            sentence = self.parse_url(url)
            self.insert_sentence(sentence, url)
            print url['full_url']
            print sentence


if __name__ == "__main__":
    from link import lnk
    prototype = lnk.dbs.crushercache
    connectors = {"prototype", prototype}

    ps = PopulateSentence(prototype)
    ps.run()

