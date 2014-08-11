import os 
import bcrypt

_bcrypt_hashpw = bcrypt.hashpw
class PasswordHash:
    
    def __init__(self, iteration_count_log2=8):

        if iteration_count_log2 < 4 or iteration_count_log2 > 31:
            iteration_count_log2 = 8
        self.iteration_count_log2 = iteration_count_log2

    
    def gensalt_blowfish(self, inp):
        # Using from phpass
        itoa64 = \
        './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        outp = '$2a$'
        outp += chr(ord('0') + self.iteration_count_log2 / 10)
        outp += chr(ord('0') + self.iteration_count_log2 % 10)
        outp += '$'
        cur = 0
        while True:
            c1 = ord(inp[cur])
            cur += 1
            outp += itoa64[c1 >> 2]
            c1 = (c1 & 0x03) << 4
            if cur >= 16:
                outp += itoa64[c1]
                break
            c2 = ord(inp[cur])
            cur += 1
            c1 |= c2 >> 4
            outp += itoa64[c1]
            c1 = (c2 & 0x0f) << 2
            c2 = ord(inp[cur])
            cur += 1
            c1 |= c2 >> 6
            outp += itoa64[c1]
            outp += itoa64[c2 & 0x3f]
        return outp
        
    def hash_password(self, pw):
        pw = pw.encode('utf-8')
        rnd = os.urandom(16)
        salt = self.gensalt_blowfish(rnd)
        hx = _bcrypt_hashpw(pw, salt)
        if len(hx) == 60:
            return hx
        
    def check_password(self, pw, stored_hash):
        pw = pw.encode('utf-8')
        hx = _bcrypt_hashpw(pw, stored_hash)
        return hx == stored_hash
