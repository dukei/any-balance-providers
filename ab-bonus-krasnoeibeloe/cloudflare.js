function Cloudflare(_url){
    var _AnyBalance = AnyBalance;
    var headers = addHeaders(g_headers, {Referer: _url});
    var imagesToLoad = [];

    var m_elements = {};

    function Location(){
        function reload(){
            if(_window.onunload)
                _window.onunload();
        }
        
        return {
            href: _url,
            reload: reload
        }
    }

    var _window = {
    	location: Location(),
    	document: _document,
    };

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

    	function joinURLs(urlbase, urlrel){
            if(!/^https?:/i.test(urlrel)){
            	var base = _url;
            	if(/^\//.test(urlrel))
            		base = getBaseurl(urlbase);
            	urlrel = (base + '/' + urlrel).replace(/([^:])\/{2,}/g, '$1/');
            }
            return urlrel;
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
        },
        set cookie(info){
        	var path = getParam(info, null, null, /\bpath=([^;]*)/i);
        	var nameval = getParam(info, null, null, /^[^;]*/).match(/([^=]*)=(.*)/);
        	_AnyBalance.setCookie(getHostname(), nameval[1], nameval[2], {path: path});
        },

        createElement: function(tag){
            return _Element(tag);
        },

        getElementById: function(id){
        	return m_elements[id];
        },

        window: _window
    };

    function getHostname(){
        return getParam(_url, null, null, /^https?:\/\/([^\/]*)/i);
    }

    function getBaseurl(url){
        return getParam(url || _url, null, null, /^(https?:\/\/[^\/]*)/i);
    }

    function getPath(){
        return getParam(_url, null, null, /^https?:\/\/[^\/]*(\/?[^\?]*)/i);
    }

    function isCloudflared(html){
        return /<input[^>]+name="jschl_vc"[^>]*value="([^"]*)/i.test(html);
    }

    function executeScript(html){
        var paramNames = "window,document,location,parent";
        var paramValues = [_window,_document,_window.location,_window];

        var jschl_vc = getParam(html, null, null, /<input[^>]+name="jschl_vc"[^>]*value="([^"]*)/i, null, html_entity_decode);
        if(!jschl_vc)
        	throw new _AnyBalance.Error('Не удалось найти секретный ключ Cloudflare');

        var jschl_answer = new _Element('input', {name: 'jschl_answer'});

        m_elements = { //Создаём элементы, которые мы должны будем найти скриптом.
        	jschl_vc: new _Element('input', {value: jschl_vc}),
        	'jschl-answer': jschl_answer,
        	'challenge-form': new _Element('form', {action: '/cdn-cgi/l/chk_jschl'}, [
        		new _Element('input', {name: 'jschl_vc', value: jschl_vc}),
        		jschl_answer,
        	]),
        };

        var matches = /setTimeout\(function\(\)\{([\s\S]*?)\},\s*(\d+)\)/.exec(html);
        if(!matches){
        	_AnyBalance.trace(html);
        	throw new _AnyBalance.Error('Не удалось найти скрипт Cloudflare для выполнения');
        }
		var obfuscatedScript = matches[1];
		_AnyBalance.sleep(+matches[2]);

        safeEval(obfuscatedScript, paramNames, paramValues);

    	if(_AnyBalance.getLevel() >= 9){
			_AnyBalance.setData('__cfduid', _AnyBalance.getCookie('__cfduid'));
			_AnyBalance.setData('cf_clearance', _AnyBalance.getCookie('cf_clearance'));
			_AnyBalance.saveData();
		}

        return _document._lastHtml;
    }

    _window.parent = _window;

    if(_AnyBalance.getLevel() >= 9){
   		_AnyBalance.setCookie(getHostname(), '__cfduid', _AnyBalance.getData('__cfduid'));
   		_AnyBalance.setCookie(getHostname(), 'cf_clearance', _AnyBalance.getData('cf_clearance'));
   	}

    return {
        document: _document,
        window: _window,

        isCloudflared: isCloudflared,
        executeScript: executeScript
    };
}