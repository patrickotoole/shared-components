import logging

def service_params(fn):

    def qs_to_dict(params):
        qs = []
        if len(params):
            split_params = params.split("&")
            for kv in split_params:
                kvalue = kv.split("=")
                try:
                    value = int(kvalue[1]) 
                except:
                    value = kvalue[1]
                qs += [(kvalue[0],value)]
        return dict(qs)
 

    def fn_with_kwargs(url,*args,**kwargs):
        split = url[1:].split("?")
        extra = {
            "service": split[0],
            "qs": qs_to_dict(split[1] if len(split) > 1 else "")
        }

        kwargs = dict(extra.items() + kwargs.items())
        logging.info("mocked: " + url)
        return fn(url,*args, **kwargs)

    return fn_with_kwargs

