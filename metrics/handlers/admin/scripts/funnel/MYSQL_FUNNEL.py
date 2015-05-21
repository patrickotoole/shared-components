GET = """
SELECT  
    a.funnel_id,
    a.funnel_name,
    a.owner,
    a.pixel_source_name,
    b.action_name,
    b.operator,
    c.order,
    d.*
FROM funnel a 
    LEFT JOIN funnel_actions c ON a.funnel_id = c.funnel_id
    LEFT JOIN action b ON b.action_id = c.action_id
    LEFT JOIN action_patterns d ON b.action_id = d.action_id
WHERE
%(where)s
"""

GET_FUNNEL_ACTION = """
SELECT * FROM funnel_actions
WHERE funnel_id = %s
"""

INSERT_FUNNEL = """
INSERT INTO funnel
    (funnel_name, owner, pixel_source_name) 
VALUES 
    ("%(funnel_name)s", "%(owner)s", "%(advertiser)s")
"""

UPDATE_FUNNEL_ACTION = """
UPDATE funnel_actions SET %(fields)s
WHERE funnel_id = %(funnel_id)s and action_id = %(action_id)s
"""

DELETE_FUNNEL_ACTION = """
DELETE FROM funnel_actions 
WHERE funnel_id = %(funnel_id)s and action_id = %(action_id)s
"""
 

UPDATE_FUNNEL = """
UPDATE funnel SET %(fields)s
WHERE funnel_id = %(funnel_id)s
"""

INSERT_FUNNEL_ACTIONS = """
INSERT INTO funnel_actions
    (funnel_id, action_id, `order`)
VALUES
    (%(funnel_id)s, %(action_id)s, %(order)s)
"""
 
