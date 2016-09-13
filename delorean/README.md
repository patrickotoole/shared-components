## Delorean Streaming Application

This application provides live insight into the number of users that are being added to each segment, per second. 

Note: although this shows up the the second information, users are actually added approximately every 5 minutes as part of a batch flush. Users are deduplicated at that time so actual volume of users added per minute will be lower.

### Usage

The application has an HTML and a websocket route. The websocket route provides streaming data for the main route of application

### TODO

- Add unit tests to functions in helpers.py

- Add "segment value" to the grouping rather than just grouping by segment
- Expand UI to include "segment value"

- Add "appnexus name" from mysql (rockerbox.delorean_segments) to segment + value
- Expand UI to include "appnexus name"

- Make ui filtering work off of "appnexus name" rather than segment_id
