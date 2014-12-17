import maxminddb
import redis
import os

maxmind_path = os.environ.get("MAXMIND_PATH",False)
if maxmind_path:
    reader = maxminddb.Reader(maxmind_path)
else:
    reader = dict()

from lib.buffered_socket.qs import QSBufferedSocketFactory
from lib.buffered_socket.schema import SchemaBufferedSocketFactory

from lib.buffered_socket.maxmind import MaxmindLookup
from lib.buffered_socket.redis import RedisApprovedUID
from lib.buffered_socket.domain import DomainLookup

from streaming import BufferControl

_redis = redis.StrictRedis(host='162.243.123.240', port=6379, db=1)


track_buffer = []
view_buffer = []
imps_buffer = []

pixel_parsers = {
    "ip_address":MaxmindLookup(reader),
    "uid":RedisApprovedUID([_redis]),
    "referrer": DomainLookup()
}

view_schema = ["auction_id", "uid",
            "seller", "tag", "pub", "venue", "ecp",
            "price", "creative", "visible", "elapsed",
            "action", "ref", "parent"
        ]

track_factory = QSBufferedSocketFactory(
    track_buffer,
    pixel_parsers,
    BufferControl()
)
view_factory = SchemaBufferedSocketFactory(
    view_buffer,
    view_schema,
    pixel_parsers,
    BufferControl()
)
