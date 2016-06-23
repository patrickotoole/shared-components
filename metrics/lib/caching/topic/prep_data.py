STOP_WORDS = ["has","top","she","most","their","had","his","get",
    "homepage","didnt","about","who","srch","with","like",
    "have","been","story","ver2","crd","what","quiz","this",
    "when","they","were","than","that","its","guy","why",
    "can","was","did","just","yeah","know","the","for","from",
    "and","are","but","not","you","your","how","make","all",
    "any","her","him","now","subject","news","archives","will",
    "articles", "detail","article","best","new","photos","need",
    "review", "reveals", "against", "results","twitter","watch","some",
    "out","makes", "under", "these", "index", "video", "after", "before",
    "ever","say","youre","hes", "our", "ideas","into", "one", "two", "whats",
    "between","initial","way","pics","pictures","them","very","would","should",
    "free"
]

def parse_words(d):
    d = d.lower()
    dd = d.replace("http://","")
    dd = dd.split(".com")
    dd = dd[1] if len(dd) > 1 else dd[0]
    dd = dd.split(".net")
    dd = dd[1] if len(dd) > 1 else dd[0]
    
    dd = dd.split("?")[0]
    dd = dd[1:] if dd.startswith("/") else dd
    dd = dd[:-1] if dd.endswith("/") else dd

    last = dd.split("/")[-1]
        
    words = [k for j in last.split("-") for k in j.split("_")]
    words = [w.split(".")[0] for w in words if not w.isdigit()]
    words = [w for w in words if len(w) > 2 and len(w) < 14]
    words = [w for w in words if w not in STOP_WORDS]
    
    return words

def prep_data(df):
    from collections import Counter

    assert("url" in df.columns)

    c = Counter()

    df['words'] = df.url.map(parse_words)
    df['word_index'] = df.words.map(lambda x: "-".join(x))
    newdf = df[df.words.map(lambda x: len(x)) > 1].drop_duplicates(cols="url").drop_duplicates(cols="word_index")

    newdf.words.map(c.update)

    freq = dict(c)
    freq_list = [i for i,j in freq.items() if j > 2]

    newdf['words'] = newdf.words.map(lambda x: [y for y in x if y in freq_list])
    newdf['word_index'] = newdf.words.map(lambda x: "-".join(x))
    newdf = newdf.drop_duplicates(cols="word_index")

    return newdf
