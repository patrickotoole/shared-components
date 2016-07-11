import logging
from helpers import _create_signature_v2, build_track, build_link_track

def send(to="rick@rockerbox.com", subject="You've been invited to Hindsight",base_url="http://hindsight.getrockerbox.com/signup?setup=1&nonce="):

    nonce = _create_signature_v2("rickotoole",to)
    track = build_track(to,"e-mail - invite (opened)")

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
<div style="font-size:32px;color:black;padding-top:40px">A team member needs your help to setup Hindsight</div>
<div style="font-size:14px;line-height:22px;padding-top:40px;padding-bottom:60px">Hindsight is the easiest way to know what content your audience is reading and where you should be engaging with that audience to find more users.</div>
<a href="{0}" style="color:#5084b2;padding:15px;text-decoration:none;text-align:center;font-size:20px;text-transform:uppercase;background-color:#fee778;color:black;font-weight:bold;margin-bottom:60px" target="_blank">
  See Instructions
</a>
</div>
</td>
</tr>
</table>
<table class="email_bottom_footer" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="f7f7f7"><tbody><tr><td align="center"><table width="550" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td style="width:550px;min-width:550px;font-size:0pt;line-height:0pt;padding:0;margin:0;font-weight:normal;Margin:0"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="35" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;text-align:center"><div><a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"><span style="color:#808285;text-decoration:underline">Hindsight by Rockerbox</span></a></div></div><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="12" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;text-align:center"><div><a href="http://rockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"><span style="color:#808285;text-decoration:underline">Rockerbox for Media</span></a></div></div><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="20" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><table width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0"><tbody><tr><td style="font-size:0pt;line-height:0pt;text-align:left" width="42"><a href="http://crusher.getrockerbox.com" style="color:#000000;text-decoration:none" target="_blank"><img src="https://ci4.googleusercontent.com/proxy/HYnWsgMd_yqOd8eOpwAHwr5x2P2qvQbR2cZHH4zVQMlrWhJNYtfKM86FsDPQRYdvvZcbXg8LR7AmXblF8kGXN8U8JhfiwC5CLjNpwnWPx1Hjdo8mItR1dQ96wev1rtsK8SI=s0-d-e1-ft#https://d16cs9nbg8x6iq.cloudfront.net/i/87094520e08f1d2d1d6d1181c523c785/png" width="20" style="max-width:20px" height="20" alt="" border="0" class="CToWUd"></a></td><td style="font-size:0pt;line-height:0pt;text-align:left" width="42"><a href="http://crusher.getrockerbox.com" style="color:#000000;text-decoration:none" target="_blank"><img src="https://ci6.googleusercontent.com/proxy/WYuFcqkaWkif6U2Xipbb1_Qql2neK4fu8tc3LLtNfddpEDX9AOfJreE2oMxk3vbAYwso5piQRZMmIfYFrB4vc_6lVmOtTQoetURsNE_tkyw1j_IIGN1Ka5xrRJ5BgKgjIRk=s0-d-e1-ft#https://d16cs9nbg8x6iq.cloudfront.net/i/7e6637b7dc1a5240c087f0dc9b39e8f8/png" width="20" style="max-width:20px" height="20" alt="" border="0" class="CToWUd"></a></td><td style="font-size:0pt;line-height:0pt;text-align:left" width="20"><a href="http://crusher.getrockerbox.com" style="color:#000000;text-decoration:none" target="_blank"><img src="https://ci4.googleusercontent.com/proxy/jA4StlkrxPWJ25wHUL9q-MOzEyoWNy8Uczn50L8S0n1r2OcVXbxvFVC2dmSh9ftyvbBTqs2JKMLKgtv111v4KwV1o8elLMrnA3FnGXFYfxB-Hcxy8rle-B-B1Y1ODUJeuNQ=s0-d-e1-ft#https://d16cs9nbg8x6iq.cloudfront.net/i/bd54ee52648c11bb42b5ba0d2c772e0a/png" width="20" style="max-width:20px" height="20" alt="" border="0" class="CToWUd"></a></td></tr></tbody></table></td></tr></tbody></table><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="9" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;text-align:center"><div><a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"><span style="color:#808285;text-decoration:underline">crusher.getrockerbox.com</span></a> | <a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"><span style="color:#808285;text-decoration:underline">@rockerbox</span></a> | <a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"><span style="color:#808285;text-decoration:underline">(201) 455-7665</span></a></div></div><table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"><tbody><tr><td height="18" style="font-size:0pt;line-height:0pt;text-align:center;width:100%;min-width:100%"></td></tr></tbody></table><div style="color:#808285;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:17px;text-align:center"><div><a href="http://crusher.getrockerbox.com" style="color:#808285;text-decoration:underline" target="_blank"></a></div></div></td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody></table>
""" 
    link = build_link_track(to,base_url + nonce,"e-mail - invite (click)")

    logging.info("sending email to" + nonce )
    part1 = MIMEText("Welcome to Hindight! ", 'plain')
    part2 = MIMEText(html.format(link) + track, 'html')
    
    msg.attach(part1)
    msg.attach(part2)
    
    server.sendmail(msg['From'], msg['To'], msg.as_string())

if __name__ == "__main__":
    
    send(base_url="http://slave7:8888/signup?setup=1&nonce=")
