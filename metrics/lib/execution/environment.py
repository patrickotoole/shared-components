import log

FN_STR = "def %(name)s(params={}):\n"

JS_STR = """
    import subprocess
    import json
    process2 = subprocess.Popen(['node','/tmp/%(name)s.js'],stdout=subprocess.PIPE,stdin=subprocess.PIPE)
    data = process2.communicate(input=json.dumps(params) )[0]
    return json.loads(data)
"""

class ExecutionEnvironment(object):

    def __init__(self,functions):

        self._env = {"logging":log.logging, "logging_info":log.logging_info} 
        code = compile("\n\n".join(functions), '<string>', 'exec')
        exec code in self._env

    def env(self):
        return self._env

    def run(self, func_name, *args, **kwargs):
        env = self.env()
        return env[func_name](*args, **kwargs)


def wrap_py(name, code):

    if not code.startswith("def %s" % name):
        
        FN = FN_STR % {"name":name}

        lines = ["    " + line for line in code.split("\n")]
        code = FN + "\n".join(lines)

    func = log.add_logging_to_python(name,code)
    return func

def wrap_js(name,code):

    name = name[:-3]

    with open('/tmp/%s.js' % name, 'w') as f:
        f.write(code)

    FN = FN_STR % {"name": name}
    FN += JS_STR % {"name": name}
    
    return FN

if __name__ == "__main__":
    py_js = wrap_js("yo","console.error('yo'); console.log('[\"yo\"]')")

    py = wrap_py("yopy","print params")
    py2 = wrap_py("yopy2","def yopy2(params):\n    print 'hello' \n    return []")


    env = ExecutionEnvironment([py_js,py,py2])
    print env.run('yo',{})
    print env.run('yopy',{})
    print env.run('yopy2',{})


