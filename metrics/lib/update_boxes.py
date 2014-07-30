from tornado.httpclient import HTTPClient
import sys
import logging

BOXES = [
"162.243.254.140","107.170.106.25","162.243.242.74","107.170.91.245","162.243.85.197",
"107.170.71.81","107.170.34.108","192.241.187.161","107.170.4.34","107.170.14.109",
"107.170.116.84","107.170.116.105","107.170.116.94","162.243.237.28","107.170.160.19",
"162.243.235.62","107.170.146.225","107.170.171.102","162.243.218.228","107.170.28.193",
"162.243.224.211","162.243.239.170","107.170.126.48"
]

def update_boxes(boxes=BOXES,timeout=1):
    """
    Trigger update on remote boxes using IP Address
    """
    http_client = HTTPClient() 
    for ip in boxes:
        try:
            response = http_client.fetch(
                "http://%s:8888/load_profile" % ip, 
                request_timeout=timeout
            )
            logging.info("Success: %s" % ip)
        except:
            logging.info("Failed: %s" % ip)
    http_client.close()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    update_boxes()
