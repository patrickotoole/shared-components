def build_track(to,link,title):
    import ujson
    import urllib
    j = {
        "event": "email - digest (article clicked)", 
        "properties": {
            "distinct_id": to, 
            "token": "a48368904183cf405deb90881e154bd8", 
            "link": link,
            "title": title,
            "campaign": "digest"
        }
    }
    _j = ujson.dumps(j).encode("base64").replace("\n","")
    src = "http://api.mixpanel.com/track/?data=%s&redirect=%s&ip=1" % (_j,urllib.quote_plus(link))
    return src

def main(db, advertiser, pattern, email, title, subject="Hindsight Daily Digest", limit=10):

    import os
    import subprocess
    import logging

    from run import run
    from send import send

    _dir = os.path.dirname(os.path.realpath(__file__))
    joined = ", ".join(map(str,[advertiser, pattern, email, title, limit]))

    
    logging.info("Started email for (%s)" % joined)
    _json = run(db, advertiser, pattern, limit)


    import ujson
    js = ujson.loads(_json)
    for obj in js:
        obj['url'] = build_track(email,obj['url'],obj['title'])

    _json = ujson.dumps(js)

    logging.info("building email...")
    process2 = subprocess.Popen(['node','%s/generate_dom.js' % _dir,' %s ' % title], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    dom = process2.communicate(input=_json)[0]

    logging.info("sending email...")
    send(dom, email, subject)

    logging.info("Completed email for (%s)." % joined)


if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("title", default=" Your ")
    define("email", default="rick+hindsight@rockerbox.com")
    define("limit", default=10)
    define("subject", default="Hindsight Top Sites")

    basicConfig(options={})
    parse_command_line()
    from link import lnk
    main(lnk.dbs.crushercache, options.advertiser, options.pattern, options.email, options.title, options.subject, options.limit)
