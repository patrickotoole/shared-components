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
    "between","initial","way","pics","pictures","them","very","would","should","could",
    "free", "things", "thing", "use", "images", "tips", "list", "full", "ways",
    "over", "says", "people", "first", "down", "goes", "does", "dont", "want","off",
    "never", "knew", "world", "really", "tell", "heres", "going", "more", "good", "too",
    "wants","needs","see"
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
    #words = [w for w in words if w not in STOP_WORDS]
    
    return words

def parse_words_title(d):
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
    words = [wrd for wrd in last.split(" ")]
    words = [w.split(".")[0] for w in words if not w.isdigit()]
    words = [w for w in words if len(w) > 2 and len(w) < 14]
    #words = [w for w in words if w not in STOP_WORDS]

    return words

def ngrams(words,n=2,pad=False):
    grams= words
    if pad: grams += [""]
    return (" ".join(grams[i:i+n]) for i in range(0, len(grams) - (n - 1)))

def bigram_eval(co,bi):

    def evaluate_bigram(phrase):
        x1, x2 = phrase.split()
        prob_x1_not_phrase = 1.0*(co[x1] - bi[phrase])/co[x1]
        prob_x2_not_phrase = 1.0*(co[x2] - bi[phrase])/co[x2]
        prob_x2_x1 = 1.0*bi[phrase]/co[x1]
    
        return (prob_x1_not_phrase/prob_x2_x1 > 1 or prob_x2_not_phrase/prob_x2_x1 > 1)

    return evaluate_bigram

def proper_bigram_eval(co,bi):

    def evaluate_bigram(phrase):
        x1, x2 = phrase.split()
        prob_x2_not_phrase = 1.0*(co[x2] - bi[phrase])/co[x2]
        prob_x2_x1 = 1.0*bi[phrase]/co[x1]

        if prob_x2_not_phrase == 0: return True
        return prob_x2_x1/prob_x2_not_phrase > 2

    return evaluate_bigram



def replace_bigrams_factory(bigrams):
    def replace(words):
        grams = ngrams(words,pad=True)
        skip = False
        ws = []
        for pos,gram in enumerate(grams):
            if not skip:
                if gram in bigrams:
                    skip = True
                    ws += [gram]
                else:
                    ws += [words[pos]]
            else:
                skip = False
        return ws

    return replace

def noun_bigrams_factory(bigrams):
    def replace(words):
        grams = ngrams(words,pad=True)
        skip = False
        ws = []
        for pos,gram in enumerate(grams):
            if not skip:
                if gram in bigrams:
                    skip = True
                    ws += [gram.split(" ")[1]]
                else:
                    ws += [words[pos]]
            else:
                skip = False
        return ws

    return replace



def prep_data(df, use_title):
    from collections import Counter

    assert("url" in df.columns)

    co = Counter()
    if use_title:
        df['words'] = df.title.map(parse_words_title)
    else:
        df['words'] = df.url.map(parse_words)

    bigrams = df.words.map(ngrams)
    bi = Counter()
    bigrams.map(bi.update)

    df.words.map(co.update)
    freq = dict(co)

    is_bigram = bigram_eval(co,bi)
    bgs = [i for i,j in bi.most_common(100) if is_bigram(i) and not (i.split()[0] in STOP_WORDS or i.split()[1] in STOP_WORDS)]
    is_proper_noun = proper_bigram_eval(co,bi)
    nouns = [i for i,j in bi.most_common(100) if is_proper_noun(i) and not (i.split()[0] in STOP_WORDS or i.split()[1] in STOP_WORDS)]

    replacer = replace_bigrams_factory(bgs)
    noun_replacer = noun_bigrams_factory(nouns)
    df['words'] = df.words.map(replacer)
    df['words'] = df.words.map(noun_replacer)

    df['words'] = df.words.map(lambda words: [w for w in words if w not in STOP_WORDS] )
    df['word_index'] = df.words.map(lambda x: "-".join(x))
    newdf = df[df.words.map(lambda x: len(x)) > 1].drop_duplicates(cols="url").drop_duplicates(cols="word_index")
    
    freq_list = [i for i,j in freq.items() if j > 2]

    newdf['words'] = newdf.words.map(lambda x: [y for y in x if y in freq_list])

    newdf['word_index'] = newdf.words.map(lambda x: "-".join(x))
    newdf = newdf.drop_duplicates(cols="word_index")

    return newdf, co
