def send(html, to="rick@rockerbox.com", subject="Hindsight Daily Digest"):

    import smtplib
    
    username = 'rick@rockerbox.com'
    password = 'inwcwqcfehmkjsqb'
    server = smtplib.SMTP('smtp.gmail.com:587')
    server.starttls()
    server.login(username,password)
    
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From'] = "hello@rockerbox.com"
    msg['To'] = to
    
    part1 = MIMEText("What are your customers reading?", 'plain')
    part2 = MIMEText(html, 'html')
    
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
