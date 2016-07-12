import logging
from helpers import _create_signature_v2, build_track, build_link_track

def send(to="rick@rockerbox.com", subject="Welcome to Hindsight",base_url="http://hindsight.getrockerbox.com/signup?nonce="):

    nonce = _create_signature_v2("rickotoole",to)
    track = build_track(to)
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
    msg['From'] = "\"Welcome to Hindsight\" <hello@rockerbox.com>";
    msg['To'] = to


    html = """
<table class="email_top_small" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f7f7"><tbody><tr><td align="center"><table width="550" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td style="width:550px;min-width:550px;font-size:0pt;line-height:0pt;padding:0;margin:0;font-weight:normal;Margin:0"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="25" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:16px;text-align:center;"><div></div></div><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="30" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>
<table width="100%" bgcolor="#f7f7f7">
<tr>
<td align="center">
<div style="padding:25px;text-align:center;font-family:helvetica neue;;width:500px;font-family:Trebuchet MS,Tahoma,Helvetica,Arial,sans-serif;color:black">
<div style="font-size:32px;color:black;padding-top:40px">Welcome to Hindsight!</div>
<div style="font-size:14px;line-height:22px;padding-top:40px;padding-bottom:60px">Hindsight is the easiest way to know what content your audience is reading and where you should be engaging with that audience to find more users.</div>
<a href="{0}" style="color:#5084b2;padding:15px;text-decoration:none;text-align:center;font-size:20px;text-transform:uppercase;background-color:#fee778;color:black;font-weight:bold;margin-bottom:60px" target="_blank">
  Create Password
</a>
</div>
</td>
</tr>
</table>
<table class="email_bottom_footer" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="f7f7f7"><tbody><tr><td align="center"><table width="550" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td style="width:550px;min-width:550px;font-size:0pt;line-height:0pt;padding:0;margin:0;font-weight:normal;Margin:0"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="35" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;text-align:center"><div><a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"><span style="color:#808285;text-decoration:underline">Hindsight by Rockerbox</span></a></div></div>
<div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;text-align:center;height:50px"><div><a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"></a></div></div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>
""" 
    link = build_link_track(to,base_url + nonce)

    logging.info("sending email to" + nonce )
    part1 = MIMEText("Welcome to Hindight! ", 'plain')
    part2 = MIMEText(html.format(link) + track, 'html')
    
    msg.attach(part1)
    msg.attach(part2)
    
    server.sendmail(msg['From'], msg['To'], msg.as_string())

if __name__ == "__main__":
    
    send(base_url="http://slave7:8888/signup?nonce=")