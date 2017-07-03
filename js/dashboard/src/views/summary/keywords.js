import diff_bar from '../../generic/diff_bar'
import comp_bar from '../../generic/comp_bar'

export function drawKeywords(target,data) {

  comp_bar(target)
    .data(data)
    .title("Keywords visited for filtered versus all views")
    .pop_value_accessor("pop")
    .samp_value_accessor("samp")
    .draw()

}

export function drawKeywordDiff(target,data) {

  diff_bar(target)
    .data(data)
    .title("Keyword indexing versus comp")
    .value_accessor("normalized_diff")
    .draw()

}
