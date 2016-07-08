def _create_signature_v2(secret, s):
    import hmac
    import hashlib
    hash = hmac.new(secret, digestmod=hashlib.sha256)
    hash.update(s)
    return hash.hexdigest().encode("ascii")


