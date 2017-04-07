def build_track(to):
    import ujson
    j = {
        "event": "e-mail - digest (opened)", 
        "properties": {
            "distinct_id": to, 
            "token": "a48368904183cf405deb90881e154bd8", 
            "campaign": "digest"
        }
    }
    _j = ujson.dumps(j).encode("base64").replace("\n","")
    src = "http://api.mixpanel.com/track/?data=%s&ip=1&img=1" % _j
    return '<img src="%s" />' % src
    

def send(html, to="rick@rockerbox.com", subject="Hindsight Daily Digest"):

    import smtplib
    
    username = 'rick@rockerbox.com'
    password = 'inwcwqcfehmkjsqb'
    server = smtplib.SMTP('smtp.gmail.com:587')
    server.starttls()
    server.login(username,password)
    
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    track = build_track(to)
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = "\"Hindsight Digest\" <hello@rockerbox.com>";
    msg['To'] = to
    
    part1 = MIMEText("What are your customers reading?", 'plain')
    part2 = MIMEText(html + track, 'html')
    
    msg.attach(part1)
    msg.attach(part2)
    
    server.sendmail(msg['From'], msg['To'], msg.as_string())

    
if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("email", default="rick@rockerbox.com")
    define("subject", default="Hindsight Daily Digest")

    basicConfig(options={})
    parse_command_line()

    import sys
    buf = ""
    for line in sys.stdin:
        buf += line
    
    html = buf.split("<body>")[1].split("</body>")[0]
    send(html, options.email, options.subject)
