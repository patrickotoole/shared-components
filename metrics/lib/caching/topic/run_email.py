def main(advertiser, pattern, email, title, limit=10):

    import os
    import subprocess
    import logging

    _dir = os.path.dirname(os.path.realpath(__file__))

    joined = ", ".join(map(str,[advertiser, pattern, email, title, limit]))

    logging.info("Started email for (%s)" % joined)

    logging.info("getting articles...")
    process = subprocess.Popen(['python','%s/run.py' % _dir,'--advertiser=%s' % advertiser,'--pattern=%s' % pattern, '--limit=%s' % limit], stdout=subprocess.PIPE)
    json = process.stdout.read()
    
    logging.info("building email...")
    process2 = subprocess.Popen(['node','%s/generate_dom.js' % _dir,' %s ' % title], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    dom = process2.communicate(input=json)[0]

    logging.info("sending email...")
    process3 = subprocess.Popen(['python','%s/send.py' % _dir,'--email=%s' % email], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    final = process3.communicate(input=dom)[0]

    logging.info("Completed email for (%s)." % joined)

 
    

if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("title", default=" Your ")
    define("email", default="rick@rockerbox.com")
    define("limit", default=10)

    basicConfig(options={})
    parse_command_line()

    main(options.advertiser, options.pattern, options.email, options.title, options.limit)
   
    
