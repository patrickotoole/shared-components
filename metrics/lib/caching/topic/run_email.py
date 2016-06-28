if __name__ == "__main__":

    from lib.report.utils.loggingutils import basicConfig
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("advertiser",  default="")
    define("pattern", default="/")
    define("title", default=" Your ")
    define("email", default="rick@rockerbox.com")

    basicConfig(options={})
    parse_command_line()

    import os
    _dir = os.path.dirname(os.path.realpath(__file__))

    import ipdb; ipdb.set_trace()

    import subprocess
    
    process = subprocess.Popen(['python', '%s/run.py' % _dir, '--advertiser=%s' % options.advertiser, '--pattern=%s' % options.pattern], stdout=subprocess.PIPE)
    json = process.stdout.read()
    
    process2 = subprocess.Popen(['node', '%s/generate_dom.js' % _dir, ' %s ' % options.title], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    dom = process2.communicate(input=json)[0]
    
    process3 = subprocess.Popen(['python', '%s/send.py' % _dir, '--email=%s' % options.email], stdout=subprocess.PIPE, stdin=subprocess.PIPE)
    final = process3.communicate(input=dom)[0]
    
    
