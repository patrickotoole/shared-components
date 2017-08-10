import diff_bar from '../../generic/diff_bar'
import comp_bar from '../../generic/comp_bar'

export function drawCategoryDiff(target,data) {

  diff_bar(target)
    .data(data)
    .title("Category indexing versus baseline")
    .value_accessor("normalized_diff")
    .draw()

}

export function drawCategory(target,data) {

  comp_bar(target)
    .data(data)
    .title("Categories visited for filtered versus baseline")
    .pop_value_accessor("pop")
    .samp_value_accessor("samp")
    .draw()

}
