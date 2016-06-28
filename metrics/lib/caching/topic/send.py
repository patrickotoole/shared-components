if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("email",  default="rick@rockerbox.com")

    basicConfig(options={})
    parse_command_line()


    import sys
    buf = ""
    for line in sys.stdin:
        buf += line
    
    html = buf.split("<body>")[1].split("</body>")[0]
    
    import smtplib
    
    
    username = 'rick@rockerbox.com'
    password = 'inwcwqcfehmkjsqb'
    server = smtplib.SMTP('smtp.gmail.com:587')
    server.starttls()
    server.login(username,password)
    
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "Hindsight Daily Digest"
    msg['From'] = "rick@rockerbox.com"
    msg['To'] = options.email
    
    part1 = MIMEText("What are your customers reading?", 'plain')
    part2 = MIMEText(html, 'html')
    
    msg.attach(part1)
    msg.attach(part2)
    
    server.sendmail(msg['From'], msg['To'], msg.as_string())

