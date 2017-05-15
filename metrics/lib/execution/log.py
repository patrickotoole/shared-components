
class DotDict(dict):
    def __getattr__(self, name):
        return self[name]

logging = DotDict()

def logging_info(name):
    import logging
    def info(msg, *args, **kwargs):
        if len(logging.root.handlers) == 0:
            logging.basicConfig()
        apply(logging.root.info, ("[script:" + name + "] " + msg,)+args, kwargs)

    return info

def remove_logging_from_python(name,code):
    code = code.replace("import logging","")
    splits = code.split("\n")
    return "\n".join(splits)
