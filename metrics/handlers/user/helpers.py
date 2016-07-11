def _create_signature_v2(secret, s):
    import hmac
    import hashlib
    hash = hmac.new(secret, digestmod=hashlib.sha256)
    hash.update(s)
    return hash.hexdigest().encode("ascii")

def build_track(to,event="e-mail - activate (opened)"):
    import ujson
    j = {
        "event": event, 
        "properties": {
            "distinct_id": to, 
            "token": "a48368904183cf405deb90881e154bd8", 
            "campaign": "signup"
        }
    }
    _j = ujson.dumps(j).encode("base64").replace("\n","")
    src = "http://api.mixpanel.com/track/?data=%s&ip=1&img=1" % _j
    return '<img src="%s" />' % src
 
def build_link_track(to,link,event="e-mail - activate (click)"):
    import ujson
    import urllib
    j = {
        "event": event, 
        "properties": {
            "distinct_id": to, 
            "token": "a48368904183cf405deb90881e154bd8", 
            "link": link,
            "campaign": "digest"
        }
    }
    _j = ujson.dumps(j).encode("base64").replace("\n","")
    src = "http://api.mixpanel.com/track/?data=%s&redirect=%s&ip=1" % (_j,urllib.quote_plus(link))
    return src

