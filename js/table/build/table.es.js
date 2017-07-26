function __$styleInject(css, returnValue) {
  if (typeof document === 'undefined') {
    return returnValue;
  }
  css = css || '';
  var head = document.head || document.getElementsByTagName('head')[0];
  var style = document.createElement('style');
  style.type = 'text/css';
  head.appendChild(style);
  
  if (style.styleSheet){
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
  return returnValue;
}

import d3 from 'd3';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();









var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var d3_updateable = function d3_updateable(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(function (x) {
    return data ? [data] : [x];
  }, joiner || function (x) {
    return [x];
  });

  updateable.enter().append(type);

  return updateable;
};

var d3_splat = function d3_splat(target, selector, type, data, joiner) {
  var type = type || "div";
  var updateable = target.selectAll(selector).data(data || function (x) {
    return x;
  }, joiner || function (x) {
    return x;
  });

  updateable.enter().append(type);

  return updateable;
};

function d3_class(target, cls, type, data) {
  return d3_updateable(target, "." + cls, type || "div", data).classed(cls, true);
}

function noop() {}



function accessor(attr, val) {
  if (val === undefined) return this["_" + attr];
  this["_" + attr] = val;
  return this;
}

var D3ComponentBase = function () {
  function D3ComponentBase(target) {
    var _this = this;

    classCallCheck(this, D3ComponentBase);

    this._target = target;
    this._on = {};
    this.props().map(function (x) {
      _this[x] = accessor.bind(_this, x);
    });
  }

  createClass(D3ComponentBase, [{
    key: "props",
    value: function props() {
      return ["data"];
    }
  }, {
    key: "on",
    value: function on(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this;
    }
  }]);
  return D3ComponentBase;
}();

__$styleInject(".table-wrapper tr { height:33px}\n.table-wrapper tr th { border-right:1px dotted #ccc } \n.table-wrapper tr th:last-of-type { border-right:none } \n\n.table-wrapper tr { border-bottom:1px solid #ddd }\n.table-wrapper tr th, .table-wrapper tr td { \n  padding-left:10px;\n  max-width:200px\n}\n\n.table-wrapper thead tr { \n  background-color:#e3ebf0;\n}\n.table-wrapper thead tr th .title { \n  text-transform:uppercase\n}\n.table-wrapper tbody tr { \n}\n.table-wrapper tbody tr:hover { \n  background-color:white;\n  background-color:#f9f9fb\n}\n", undefined);

function Table(target) {
  this._wrapper_class = "table-wrapper";
  this._target = target;
  this._data = {}; //EXAMPLE_DATA
  this._sort = {};
  this._renderers = {};
  this._top = 0;

  this._default_renderer = function (x) {
    if (x.key.indexOf("percent") > -1) return d3.select(this).text(function (x) {
      var pd = this.parentNode.__data__;
      return d3.format(".2%")(pd[x.key] / 100);
    });

    return d3.select(this).text(function (x) {
      var pd = this.parentNode.__data__;
      return pd[x.key] > 0 ? d3.format(",.2f")(pd[x.key]).replace(".00", "") : pd[x.key];
    });
  };

  this._hidden_fields = [];
  this._on = {};

  this._render_expand = function (d) {
    d3.select(this).selectAll("td.option-header").html("&ndash;");
    if (this.nextSibling && d3.select(this.nextSibling).classed("expanded") == true) {
      d3.select(this).selectAll("td.option-header").html("&#65291;");
      return d3.select(this.parentNode).selectAll(".expanded").remove();
    }

    d3.select(this.parentNode).selectAll(".expanded").remove();
    var t = document.createElement('tr');
    this.parentNode.insertBefore(t, this.nextSibling);

    var tr = d3.select(t).classed("expanded", true).datum({});
    var td = d3_updateable(tr, "td", "td").attr("colspan", this.children.length);

    return td;
  };
  this._render_header = function (wrap) {

    wrap.each(function (data) {
      var headers = d3_updateable(d3.select(this), ".headers", "div").classed("headers", true).style("text-transform", "uppercase").style("font-weight", "bold").style("line-height", "24px").style("border-bottom", "1px solid #ccc").style("margin-bottom", "10px");

      headers.html("");

      d3_updateable(headers, ".url", "div").classed("url", true).style("width", "75%").style("display", "inline-block").text("Article");

      d3_updateable(headers, ".count", "div").classed("count", true).style("width", "25%").style("display", "inline-block").text("Count");
    });
  };
  this._render_row = function (row) {

    d3_updateable(row, ".url", "div").classed("url", true).style("width", "75%").style("line-height", "24px").style("height", "24px").style("overflow", "hidden").style("display", "inline-block").text(function (x) {
      return x.key;
    });

    d3_updateable(row, ".count", "div").classed("count", true).style("width", "25%").style("display", "inline-block").style("vertical-align", "top").text(function (x) {
      return x.value;
    });
  };
}

function table(target) {
  return new Table(target);
}

Table.prototype = {

  data: function data(val) {
    var value = accessor.bind(this)("data", val);
    if (val && val.values.length && this._headers == undefined) {
      var headers = Object.keys(val.values[0]).map(function (x) {
        return { key: x, value: x };
      });
      this.headers(headers);
    }
    return value;
  },
  skip_option: function skip_option(val) {
    return accessor.bind(this)("skip_option", val);
  },
  wrapper_class: function wrapper_class(val) {
    return accessor.bind(this)("wrapper_class", val);
  },

  title: function title(val) {
    return accessor.bind(this)("title", val);
  },
  row: function row(val) {
    return accessor.bind(this)("render_row", val);
  },
  default_renderer: function default_renderer(val) {
    return accessor.bind(this)("default_renderer", val);
  },
  top: function top(val) {
    return accessor.bind(this)("top", val);
  },

  header: function header(val) {
    return accessor.bind(this)("render_header", val);
  },
  headers: function headers(val) {
    return accessor.bind(this)("headers", val);
  },
  hidden_fields: function hidden_fields(val) {
    return accessor.bind(this)("hidden_fields", val);
  },
  all_headers: function all_headers() {
    var headers = this.headers().reduce(function (p, c) {
      p[c.key] = c.value;return p;
    }, {}),
        is_locked = this.headers().filter(function (x) {
      return !!x.locked;
    }).map(function (x) {
      return x.key;
    });

    if (this._data.values && this._data.values.length) {

      var all_heads = Object.keys(this._data.values[0]).map(function (x) {
        if (this._hidden_fields && this._hidden_fields.indexOf(x) > -1) return false;
        return {
          key: x,
          value: headers[x] || x,
          selected: !!headers[x],
          locked: is_locked.indexOf(x) > -1 ? true : undefined
        };
      }.bind(this)).filter(function (x) {
        return x;
      });
      var getIndex = function getIndex(k) {
        return is_locked.indexOf(k) > -1 ? is_locked.indexOf(k) + 10 : 0;
      };

      all_heads = all_heads.sort(function (p, c) {
        return getIndex(c.key || -Infinity) - getIndex(p.key || -Infinity);
      });
      return all_heads;
    } else return this.headers();
  },
  sort: function sort(key$$1, ascending) {
    if (!key$$1) return this._sort;
    this._sort = {
      key: key$$1,
      value: !!ascending
    };
    return this;
  },

  render_wrapper: function render_wrapper() {
    var wrap = this._target;

    var wrapper = d3_updateable(wrap, "." + this._wrapper_class, "div").classed(this._wrapper_class, true).style("position", "relative");

    var table = d3_updateable(wrapper, "table.main", "table").classed("main", true).style("width", "100%");

    this._table_main = table;

    var thead = d3_updateable(table, "thead", "thead");
    d3_updateable(table, "tbody", "tbody");

    var table_fixed = d3_updateable(wrapper, "table.fixed", "table").classed("hidden", true) // TODO: make this visible when main is not in view
    .classed("fixed", true).style("width", wrapper.style("width")).style("top", this._top + "px").style("position", "fixed");

    var self = this;
    try {
      d3.select(window).on('scroll', function () {
        console.log(table.node().getBoundingClientRect().top, self._top);
        if (table.node().getBoundingClientRect().top < self._top) table_fixed.classed("hidden", false);else table_fixed.classed("hidden", true);

        var widths = [];

        wrap.selectAll(".main").selectAll(".table-headers").selectAll("th").each(function (x, i) {
          widths.push(this.offsetWidth);
        });

        wrap.selectAll(".fixed").selectAll(".table-headers").selectAll("th").each(function (x, i) {
          d3.select(this).style("width", widths[i] + "px");
        });
      });
    } catch (e) {}

    this._table_fixed = table_fixed;

    var thead = d3_updateable(table_fixed, "thead", "thead");

    if (!this._skip_option) {
      var table_button = d3_updateable(wrapper, ".table-option", "a").classed("table-option", true).style("position", "absolute").style("top", "-1px").style("right", "0px").style("cursor", "pointer").style("line-height", "33px").style("font-weight", "bold").style("padding-right", "8px").style("padding-left", "8px").text("OPTIONS").style("background", "#e3ebf0").on("click", function (x) {
        this._options_header.classed("hidden", !this._options_header.classed("hidden"));
        this._show_options = !this._options_header.classed("hidden");
      }.bind(this));
    }

    return wrapper;
  },
  render_header: function render_header(table) {

    var thead = table.selectAll("thead"),
        tbody = table.selectAll("tbody");

    if (this.headers() == undefined) return;

    var options_thead = d3_updateable(thead, "tr.table-options", "tr", this.all_headers(), function (x) {
      return 1;
    }).classed("hidden", !this._show_options).classed("table-options", true);

    var h = this._skip_option ? this.headers() : this.headers().concat([{ key: "spacer", width: "70px" }]);
    var headers_thead = d3_updateable(thead, "tr.table-headers", "tr", h, function (x) {
      return 1;
    }).classed("table-headers", true);

    var th = d3_splat(headers_thead, "th", "th", false, function (x, i) {
      return x.key + i;
    }).style("width", function (x) {
      return x.width;
    }).style("position", "relative").order();

    var defaultSort = function (x) {
      if (x.sort === false) {
        delete x['sort'];
        this._sort = {};
        this.draw();
      } else {
        x.sort = !!x.sort;

        this.sort(x.key, x.sort);
        this.draw();
      }
    }.bind(this);

    d3_updateable(th, "span", "span").classed("title", true).style("cursor", "pointer").text(function (x) {
      return x.value;
    }).on("click", this.on("sort") != noop ? this.on("sort") : defaultSort);

    d3_updateable(th, "i", "i").style("padding-left", "5px").classed("fa", true).classed("fa-sort-asc", function (x) {
      return x.key == this._sort.key ? this._sort.value === true : undefined;
    }.bind(this)).classed("fa-sort-desc", function (x) {
      return x.key == this._sort.key ? this._sort.value === false : undefined;
    }.bind(this));

    var self = this;
    var can_redraw = true;

    var drag = d3.behavior.drag().on("drag", function (d, i) {
      var x = d3.event.dx;
      var w = parseInt(d3.select(this.parentNode).style("width").replace("px"));
      this.parentNode.__data__.width = w + x + "px";
      d3.select(this.parentNode).style("width", w + x + "px");

      var index = Array.prototype.slice.call(this.parentNode.parentNode.children, 0).indexOf(this.parentNode) + 1;
      d3.select(this.parentNode.parentNode.children[index]).style("width", undefined);

      if (can_redraw) {
        can_redraw = false;
        setTimeout(function () {
          can_redraw = true;
          tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").each(function (x) {
            var render = self._renderers[x.key];
            if (render) render.bind(this)(x);
          });
        }, 1);
      }
    });

    var draggable = d3_updateable(th, "b", "b").style("cursor", "ew-resize").style("font-size", "100%").style("height", "100%").style("position", "absolute").style("right", "-8px").style("top", "0").style("width", "10px").style("z-index", 1).on("mouseover", function () {
      var index = Array.prototype.slice.call(this.parentNode.parentNode.children, 0).indexOf(this.parentNode) + 1;
      tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right", "1px dotted #ccc");
    }).on("mouseout", function () {
      var index = Array.prototype.slice.call(this.parentNode.parentNode.children, 0).indexOf(this.parentNode) + 1;
      tbody.selectAll("tr").selectAll("td:nth-of-type(" + index + ")").style("border-right", undefined);
    }).call(drag);

    th.exit().remove();

    if (!this._skip_option) {
      var options = d3_updateable(options_thead, "th", "th", false, function () {
        return 1;
      }).attr("colspan", this.headers().length + 1).style("padding-top", "10px").style("padding-bottom", "10px");

      var option = d3_splat(options, ".option", "div", false, function (x) {
        return x.key;
      }).classed("option", true).style("width", "240px").style("display", "inline-block");

      option.exit().remove();

      var self = this;

      d3_updateable(option, "input", "input").attr("type", "checkbox").property("checked", function (x) {
        this.checked = x.selected;
        return x.selected ? "checked" : undefined;
      }).attr("disabled", function (x) {
        return x.locked;
      }).on("click", function (x) {
        x.selected = this.checked;
        if (x.selected) {
          self.headers().push(x);
          return self.draw();
        }
        var indices = self.headers().map(function (z, i) {
          return z.key == x.key ? i : undefined;
        }),
            index = indices.filter(function (z) {
          return z;
        }) || 0;

        self.headers().splice(index, 1);
        self.draw();
      });

      d3_updateable(option, "span", "span").text(function (x) {
        return " " + x.value;
      });
    }

    this._options_header = this._target.selectAll(".table-options");
  },

  render_rows: function render_rows(table) {

    var self = this;
    var tbody = table.selectAll("tbody");

    if (this.headers() == undefined) return;
    if (!(this._data && this._data.values && this._data.values.length)) return;

    var data = this._data.values,
        sortby = this._sort || {};

    data = data.sort(function (p, c) {
      var a = p[sortby.key] || -Infinity,
          b = c[sortby.key] || -Infinity;

      return sortby.value ? d3.ascending(a, b) : d3.descending(a, b);
    });

    var rows = d3_splat(tbody, "tr", "tr", data, function (x, i) {
      return String(sortby.key + x[sortby.key]) + i;
    }).order().on("click", function (x) {
      if (self.on("expand") != noop) {
        var td = self._render_expand.bind(this)(x);
        self.on("expand").bind(this)(x, td);
      }
    });

    rows.exit().remove();

    var td = d3_splat(rows, "td", "td", this.headers(), function (x, i) {
      return x.key + i;
    }).each(function (x) {
      var dthis = d3.select(this);

      var renderer = self._renderers[x.key];

      if (!renderer) {
        renderer = self._default_renderer.bind(this)(x);
      } else {
        return renderer.bind(this)(x);
      }
    });

    td.exit().remove();

    var o = d3_updateable(rows, "td.option-header", "td", false, function () {
      return 1;
    }).classed("option-header", true).style("width", "70px").style("text-align", "center");

    if (this._skip_option) o.classed("hidden", true);

    d3_updateable(o, "a", "a").style("font-weight", "bold").html(self.option_text());
  },
  option_text: function option_text(val) {
    return accessor.bind(this)("option_text", val);
  },
  render: function render(k, fn) {
    if (fn == undefined) return this._renderers[k] || false;
    this._renderers[k] = fn;
    return this;
  },
  draw: function draw() {
    var self = this;
    var wrapper = this.render_wrapper();

    wrapper.selectAll("table").each(function (x) {
      self.render_header(d3.select(this));
    });

    this.render_rows(this._table_main);

    this.on("draw").bind(this)();

    return this;
  },
  on: function on(action, fn) {
    if (fn === undefined) return this._on[action] || noop;
    this._on[action] = fn;
    return this;
  },
  d3: d3
};

__$styleInject(".summary-table { \n  display:inline-block;\n  vertical-align:top;\n}\n.summary-table > .title {\n  font-weight:bold;\n  font-size:14px;\n}\n\n.summary-table .wrap {\n  width:100%\n}\n", undefined);

function summary_table(target) {
  return new SummaryTable(target);
}

var SummaryTable = function (_D3ComponentBase) {
  inherits(SummaryTable, _D3ComponentBase);

  function SummaryTable(target) {
    classCallCheck(this, SummaryTable);

    var _this = possibleConstructorReturn(this, (SummaryTable.__proto__ || Object.getPrototypeOf(SummaryTable)).call(this, target));

    _this._wrapper_class = "table-summary-wrapper";
    return _this;
  }

  createClass(SummaryTable, [{
    key: 'props',
    value: function props() {
      return ["title", "headers", "data", "wrapper_class"];
    }
  }, {
    key: 'draw',
    value: function draw() {
      var urls_summary = d3_class(this._target, "summary-table");

      d3_class(urls_summary, "title").text(this.title());

      var uwrap = d3_class(urls_summary, "wrap");

      table(uwrap).wrapper_class(this.wrapper_class(), true).data({ "values": this.data() }).skip_option(true).headers(this.headers()).draw();
    }
  }]);
  return SummaryTable;
}(D3ComponentBase);

export { table, table as t, summary_table };export default table;
