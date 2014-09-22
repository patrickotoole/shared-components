Rockerbox = window.Rockerbox || {};
Rockerbox = Rockerbox || {};
Rockerbox.render = Rockerbox.render || {};

(function(){

	var cache = {};

	this.renderer = function renderer(str, data){
		// Figure out if we're getting a template, or if we need to
		// load the template - and be sure to cache the result.
		var fn = !/\W/.test(str) ?
			cache[str] = cache[str] ||
			renderer(document.getElementById(str).innerHTML) :

			new Function("obj","var p=[]; with(obj){p.push('" +

			str
				.replace(/[\r\t\n]/g, " ")
				.split("<%").join("\t")
				.replace(/((^|%>)[^\t]*)'/g, "$1\r")
				.replace(/\t=(.*?)%>/g, "',$1,'")
				.split("\t").join("');")
				.split("%>").join("p.push('")
				.split("\r").join("\\'")
				
			+ "');}return p.join('');");

			// Provide some basic currying to the user
		return data ? fn( data ) : fn;
	};
}).apply(Rockerbox.render);
