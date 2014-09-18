rockerbox = window.rockerbox || {};
rockerbox.serialize = function(obj) {
  var str = [];
  for(var p in obj)
	str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));

  return str.join("&");
}

rockerbox.vb = function(flashID,callback,pixelUrl,width,height,flashWrapper, params) {
	
	this.flashID = flashID;
	this.pixelUrl = pixelUrl;
	this.callback = callback;
	this.width = width;
	this.height = height;
	this.flashWrapper = flashWrapper;
	this.params = params;
	
	rockerbox[this.callback] = rockerbox[this.callback] || {};
	
	this.parseVersion = function(desc) {
		var f = desc.match(/[\d]+/g);
		f.length = 2;
		return f.join(".");
	}
	
	this.checkFlash = function(device) {
		var flashVersion, flash, isIE, hasFlash = false, flashDescription = false;
		if (device == "Computer") {
			if (navigator.plugins && navigator.plugins.length) {
				// Check if listed under navigator.plugins
				flash = navigator.plugins["Shockwave Flash"];
				if (flash) {
					hasFlash = true;
					flashDescription = flash.description;
				}

				if (navigator.plugins["Shockwave Flash 2.0"]) {
		            hasFlash = true;
		            flashDescription = "2.0.0.11";
		        }
			} else if (navigator.mimeTypes && navigator.mimeTypes.length) {
				// Check if under mimeTypes
				flash = navigator.mimeTypes["application/x-shockwave-flash"];
		        hasFlash = flash && flash.enabledPlugin;
		        if (hasFlash) flashDescription = flash.enabledPlugin.description;
			} else {
				// Brute force for IE
				try {
					flash = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7");
					isIE = hasFlash = true;
					flashDescription = flash.GetVariable("$version")
				} catch(e) {
					flash = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");
					isIE = hasFlash = true;
					flashDescription = "6.0.21";
					try {
						flash = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
						isIE = hasFlash = true;
						flashDescription = flash.GetVariable("$version")
					} catch (e) {}

				}
			}
			
			flashVersion = this.parseVersion(flashDescription)
			return (hasFlash) ? flashVersion : false;
		} else {
			return false
		}
	}
	
	this.createVB = function(isIE) {
		var params = {
			"run_vs" : true,
			"js_function": "rockerbox." + this.callback + "." + this.flashID,
			"js_callback":"initSwf",
			"js_getstatus":"getSwfStatus",
			"min_frame_rate": 25, 
			"max_count": 120,
			"dev_mode": false,
			"track_interval": 250,
			"global_index": 0
		}
		var params_str = rockerbox.serialize(params);
		var flashID = this.flashID;

		var vis = document.createElement("div");
		var elem = document.getElementById(flashWrapper);
		vis.id = "visionDiv";
		elem.appendChild(vis)

		var swfSize = 2,
			height = this.height,
			width = this.width;

		(isIE) ?
			this.createFlashIE(vis,params_str,flashID,"http://metrics.getrockerbox.com/getviewability.swf?"+this.params,2) :
			this.createFlash(vis,params_str,flashID,"http://metrics.getrockerbox.com/getviewability.swf?"+this.params,2);

	    var dimensions = [(height * 0.5) - (swfSize * 0.5), (width * 0.5) - (swfSize * 0.5)];
	    vis.setAttribute("style", "top:" + dimensions[0] + "px;left:" + dimensions[1] + "px;z-index:-1;position:absolute");
		elem.appendChild(vis);
		
		this.swf = document.getElementById(flashID);
		
		return this.swf;
	}
	
	this.createFlashIE = function(vis,vars,flashID,swfPath,swfSize){
		var p = '<object id="' + flashID + '" name="' + flashID + '"classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="https://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" width="' + swfSize + '" height="' + 0 + '">';
	    p += '<param name="Movie" value="' + swfPath + '">';
	    p += '<param name="FlashVars" value="' + vars + '">';
	    p += '<param name="wmode" value="transparent">';
	    p += '<param name="type" value="application/x-shockwave-flash">';
	    p += '<param name="menu" value="false">';
	    p += '<param name="AllowScriptAccess" value="always">';
	    p += "</object>";
		vis.innerHTML = p;
	}
	
	this.createFlash = function(vis,vars,flashID,swfPath,swfSize) {
		var j = document.createElement("object");
	    j.width = swfSize;
	    j.height = 0;
	    j.id = flashID;
	    j.data = swfPath;
	    var k = document.createElement("param");
	    k.name = "src";
	    k.value = swfPath;
	    j.appendChild(k);
	    k = document.createElement("param");
	    k.name = "FlashVars";
	    k.value = vars;
	    j.appendChild(k);
	    k = document.createElement("param");
	    k.name = "wmode";
	    k.value = "transparent";
	    j.appendChild(k);
	    k = document.createElement("param");
	    k.name = "menu";
	    k.value = "false";
	    j.appendChild(k);
	    k = document.createElement("param");
	    k.name = "AllowScriptAccess";
	    k.value = "always";
	    j.appendChild(k);
	    k = document.createElement("param");
	    k.name = "type";
	    k.value = "application/x-shockwave-flash";
	    j.appendChild(k);
	    vis.appendChild(j);
	}
	
	this.registerCallback = function(callback) {
		var id = this.flashID,
			gn = callback || this.defaultCallback.bind(this),
			t = new Date().getTime(),
			fn = function(a,b,c) {
				gn(id,a,b,c,new Date().getTime());
			}
		rockerbox[this.callback][this.flashID] = fn;
		this.previousTime = t;
		return this.defaultCallback.bind(this);
	}
	
	this.sendData = function(p) {
		var i = new Image();
		//console.log(p)
		i.src = this.pixelUrl + p;
	}
	
	if (this.checkFlash("Computer")) {
		this.createVB()
		this.registerCallback()
	}
}

rockerbox.vb.prototype.defaultCallback = function(id,v1,action,frames,ts) {
	var previous = this.previousTime;
	var params = {
		"flashID": id,
		"action": action,
		"ts": ts,
		"elapsed": ts - previous,
		"visible": false,
    "id": this.flashID 
	}
	
	
	
	if (this.initialized == true) {
		if (action == "out") {
			this.sendData(rockerbox.serialize(params));
		} else if (action == "changed") {
			params['visible'] = true;
			this.sendData(rockerbox.serialize(params));
		} else if (action == "in") {
			params['visible'] = true;
			this.sendData(rockerbox.serialize(params));
		} else if (action == "off") {
			this.swf.destroy();
			this.sendData(rockerbox.serialize(params));
		}
		
		this.previousTime = ts;
	} else if (action == "loaded") {
		params['visible'] = "unknown";
		this.swf.initSwf();
		this.swf.height = 2;
		this.sendData(rockerbox.serialize(params));
		setTimeout(function(){
			this.initialized = true;
			this.swf.getSwfStatus();
		}.bind(this),1000)
	}
	
	//console.log(params);
};

(function(rockerbox){
  if (rockerbox.cr.length) {
	var creative = rockerbox.cr.pop();
	//console.log(creative)
	var id = "flashPos",
		vis = document.getElementById('vis_'+creative.creative),
		f = document.createElement("div"),
		wrap = document.getElementById('cr_'+creative.creative+'_'+creative.auction_id+'_'+creative.cb);

	try { wrap.style.visibility="";} catch (e){}

	f.id = id;
	vis.appendChild(f);
	
  var callbackID = Math.random() +"";
  callbackID  = "middle_"+callbackID.slice(2,8);
  //console.log(callbackID);
  _parent = "no_top_level"
  try {
    var _parent = URIComponent(window.parent.location.href)
  } catch(e) {}
  var origin = "&origin=" + encodeURIComponent(window.location.href) + "&parent=" + _parent

	var params = rockerbox.serialize(creative) + origin + "&",
		pixel = "http://metrics.getrockerbox.com/viewability?" + params,
		visible = new rockerbox.vb(callbackID,"handleVS",pixel,creative.width,creative.height,id, params);
  }
})(window.rockerbox);
