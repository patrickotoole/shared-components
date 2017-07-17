export {default as state} from "./src/state";
export {default as qs} from "./src/qs";
export {default as comp_eval} from "./src/comp_eval";

import state from "./src/state";

export const s = window.__state__ || state()
window.__state__ = s

export default s;
