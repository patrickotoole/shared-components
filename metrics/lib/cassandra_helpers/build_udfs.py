TEMPLATE = """
CREATE OR REPLACE FUNCTION state_group_and_count_%(suffix)s( state map<text, text>, url text, uid text )
CALLED ON NULL INPUT
RETURNS map<text, text>
LANGUAGE java AS '

String pattern = (String) state.get("__pattern__");
if (pattern == null) {
  String q = "SELECT * from full_replication.function_patterns where function=''state_group_and_count_%(suffix)s'' ";
  org.apache.cassandra.cql3.UntypedResultSet rows = org.apache.cassandra.cql3.QueryProcessor.executeInternal(q);
  pattern = rows.one().getString("pattern");
  state.put("__pattern__",pattern);

}

if (url.contains(pattern)) {
  String key = url + "[:]" + uid;

  String strcount = (String) state.get(key);  
  Integer count = 0;
  if (strcount == null) count = 1; 
  else count = Integer.parseInt(strcount) + 1;
  state.put(key, Integer.toString(count)); 
}
return state; 
' ;

drop AGGREGATE group_and_count_%(suffix)s;
CREATE OR REPLACE AGGREGATE group_and_count_%(suffix)s(text, text) 
SFUNC state_group_and_count_%(suffix)s 
STYPE map<text, text> 
INITCOND {};
"""

if __name__ == "__main__":
    import sys
    suffixes = sys.argv[1:]
    for i in suffixes:
        print TEMPLATE % {"suffix":i}
