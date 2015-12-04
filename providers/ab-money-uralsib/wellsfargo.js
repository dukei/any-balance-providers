function WellsFargo(_url){
    var _AnyBalance = AnyBalance;
    var headers = addHeaders(g_headers, {Referer: _url});
    var imagesToLoad = [];

    var m_elements = {
    	body: new _Element('body')
    };

    var m_cookies = {
    };

    var m_baseTime = 0;
    var m_timeouts = [];

    function Location(){
        function reload(){
            if(_window.onunload)
                _window.onunload();
			_document._lastHtml = _AnyBalance.requestGet(this.href, headers);
        }
        
        function replace(url){
            if(_window.onunload)
                _window.onunload();
			_document._lastHtml = _AnyBalance.requestGet(joinURLs(_url, url), headers);
        }

        return {
            href: _url,
            reload: reload,
            replace: replace
        }
    }

    var _window = {
    	location: Location(),
    	document: _document,
    	setTimeout: function(callback, delay){
    		m_timeouts.push({func: callback, delay: m_baseTime + delay});
    	}
    };

    function processTimeouts(){
    	do{
    		var minTime = 200000000;
    		var minIdx = -1;
    		for(var i=0; i<m_timeouts.length; ++i){
    			var t = m_timeouts[i];
    			if(t.delay < 0)
    				continue;
    			if(t.delay < minTime)
    				minIdx = i, minTime = t.delay;
    		}
    		if(minIdx < 0)
    			return; //Закончились таймауты
    		var t = m_timeouts[minIdx];
    		if(m_baseTime < t.delay)
    			AnyBalance.sleep(t - m_baseTime);
    		m_baseTime = t.delay;
    		if(typeof(t.func) == 'string')
    			safeEval(t.func, paramNames, paramValues);
    		else
    			t.func.call(_window);
    		t.delay = -1;
    	}while(true);
    }

    function _Element(tag, attrs, children){
    	function parseAttributes(str){
    		var attribs = sumParam(str, null, null, /(\w+\s*=\s*(["'])[^'"]*\2)/g);
    		var ret = {};
    		for(var i=0; i<attribs.length; ++i){
    			var matches = /(\w+)\s*=\s*["']([^'"])/.exec(attribs[i]);
    		    ret[matches[1]] = html_entity_decode(matches[2]);
    		}
    		return ret;
    	}

      	var m_children = children || [];
      	var m_href;

        var obj = {
            set src(url){
                if(/img/i.test(tag))
                    imagesToLoad.push(getBaseurl() + url);
                else
                    _AnyBalance.trace('Can not set src of ' + tag + ' to ' + url);
            },

            set innerHTML(str){
            	var matches = /^<(\w+)\s*([^>]*)>([^<]*)<\/\1>$/.exec(str);
            	if(!matches)
            		throw new _AnyBalance.Error('Creation of too complex innerHTML is not implemented: ' + str);
                
                var attrs = parseAttributes(matches[2]);
                m_children.push(new _Element(tag, attrs));
            },

            get firstChild(){
            	return m_children[0];
            },

            set href(str){
            	m_href = joinURLs(_url, str);
            },

            get href(){
            	return m_href;
            },

            setAttribute: function(name, value){
            	if(!attrs)
            		attrs = {};
            	attrs[name] = value;
            	this[name] = value;
            },

            get tagName(){
            	return tag;
            },

            submit: function(){
            	var params = [];
            	for(var i=0; i<m_children.length; ++i){
            	    params.push([m_children[i].name, m_children[i].value]);
            	}
            	var method = this.method || 'get';
            	if(/get/i.test(method)){
            		var str = params.reduce(function(previousValue, currentValue){ return (previousValue ? previousValue + '&' : '?') + encodeURIComponent(currentValue[0]) + '=' + encodeURIComponent(currentValue[1]); }, '');
            		_document._lastHtml = _AnyBalance.requestGet(joinURLs(_url, this.action) + str, headers);
            	}else{
            		_document._lastHtml = _AnyBalance.requestPost(joinURLs(_url, this.action), params, headers);
            	}
            },
            
            appendChild: function(elem){
            	m_children.push(elem);
            }
        };

        for(var name in attrs){
        	obj[name] = attrs[name];
        }

        return obj;
    }

    function loadImages(){
        for(var i=0; i<imagesToLoad.length; ++i){
            _AnyBalance.requestGet(imagesToLoad[i], headers);
        }
        imagesToLoad = [];
    }

    var _document = {
        get cookie(){
            var cookies = _AnyBalance.getCookies();
            var domain = getHostname();
            var cookies_str = cookies.reduce(function(previousValue, currentValue){
                if(endsWith(currentValue.domain, domain)){
        		    if(previousValue)
        		    	previousValue += ';';
        		    previousValue += currentValue.name + '=' + currentValue.value;
        		}
        		return previousValue;
        	}, '');
        	return cookies_str;
/*        	var cookies = [];
        	for(var c in m_cookies){
        		cookies.push(m_cookies[c].name + '=' + m_cookies[c].value);
        	}
        	return cookies.join(';');*/
        },
        set cookie(info){
        	var path = getParam(info, null, null, /\bpath=([^;]*)/i);
        	var nameval = getParam(info, null, null, /^[^;]*/).match(/([^=]*)=(.*)/);
        	_AnyBalance.setCookie(getHostname(), nameval[1], nameval[2], {path: path});
        	/*var nameval = info.match(/([^=]*)=(.*)/);
        	m_cookies[nameval[1]] = nameval[2]; */
        },

        createElement: function(tag){
            return _Element(tag);
        },

        getElementById: function(id){
        	return m_elements[id];
        },

        getElementsByTagName: function(name){
        	var ret = [];
        	for(var id in m_elements){
        		var e = m_elements[id];
        		if(e.tagName == name)
        			ret.push(e);
        	}
        	return ret;
        },

        window: _window
    }

    var paramNames = "window,document,location,parent,setTimeout";
    var paramValues = [_window,_document,_window.location,_window,_window.setTimeout];

    function getHostname(){
        return getParam(_url, null, null, /^https?:\/\/([^\/]*)/i);
    }

    function getBaseurl(url){
        return getParam(url || _url, null, null, /^(https?:\/\/[^\/]*)/i);
    }

    function getPath(){
        return getParam(_url, null, null, /^https?:\/\/[^\/]*(\/?[^\?]*)/i);
    }

    function joinURLs(urlbase, urlrel){
        if(!/^https?:/i.test(urlrel)){
        	var base = _url;
        	if(/^\//.test(urlrel))
        		base = getBaseurl(urlbase);
        	urlrel = (base + '/' + urlrel).replace(/([^:])\/{2,}/g, '$1/');
        }
        return urlrel;
    }

    function executeScript(html){
		var obfuscatedScript = getParam(html, null, null, /<script>([\s\S]*?)<\/script>/i);

        safeEval(obfuscatedScript + '\nif(window.onload) window.onload();', paramNames, paramValues);

        processTimeouts();

        return _document._lastHtml || html;
    }

    _window.parent = _window;

/*    if(_AnyBalance.getLevel() >= 9){
   		_AnyBalance.setCookie(getHostname(), '__cfduid', _AnyBalance.getData('__cfduid'));
   		_AnyBalance.setCookie(getHostname(), 'cf_clearance', _AnyBalance.getData('cf_clearance'));
   	} */

    return {
        document: _document,
        window: _window,

        executeScript: executeScript
    };
}
