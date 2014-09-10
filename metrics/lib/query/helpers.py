
def __whereor__(field,values):
    l = [field + " = %s" % value for value in values]
    where = "(%s)" % " or ".join(l)
    return where

def __where_and_eq__(h):
    l = ["%s = '%s'" % i for i in h.iteritems()]
    return "(%s)" % " and ".join(l)
