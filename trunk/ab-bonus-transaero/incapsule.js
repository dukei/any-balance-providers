function Incapsule(_url){
    var _AnyBalance = AnyBalance;
    var headers = addHeaders(g_headers, {Referer: _url});
    var imagesToLoad = [];

    function _XMLHttpRequest(){
        var url;
        var method;
        
        function open(_method, _url){
            method = _method;
            url = getBaseurl() + _url;
        }

        function send(data){
            var html;
            if(/get/i.test(method)){
                this.responseText = _AnyBalance.requestGet(url, headers);
            }else{
                this.responseText = _AnyBalance.requestPost(url, data, headers);
            }

            this.status = _AnyBalance.getLastStatusCode();
            this.readyState = 4;
            if(this.onreadystatechange)
            	this.onreadystatechange();
        }

        return {
            open: open,
            send: send
        }
    }

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
    	XMLHttpRequest: _XMLHttpRequest,
    	location: Location(),
    	document: _document,
    	webkitURL: _webkitURL
    };

    function _Element(tag){
        return {
            set src(url){
                if(/img/i.test(tag))
                    imagesToLoad.push(getBaseurl() + url);
                else
                    _AnyBalance.trace('Can not set src of ' + tag + ' to ' + url);
            }
        }
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

        window: _window
    };

    function getHostname(){
        return getParam(_url, null, null, /^https?:\/\/([^\/]*)/i);
    }

    function getBaseurl(){
        return getParam(_url, null, null, /^(https?:\/\/[^\/]*)/i);
    }

    function getPath(){
        return getParam(_url, null, null, /^https?:\/\/[^\/]*(\/?[^\?]*)/i);
    }

    function createPlugin(plugin, mimes){
        var lplugin = [];
        for(var prop in plugin)
            lplugin[prop] = plugin[prop];
        for(var i=0; i<mimes.length; ++i){
            mimes[i].enabledPlugin = lplugin;
            lplugin.push(mimes[i]);
        }
        return lplugin;
    }

    var _navigator = {
        vendor: 'Google Inc.',
        appName: 'Netscape',
        plugins: [
            createPlugin({description: "Version 5.38.5.0", filename: "npo1d.dll", name: "Google Talk Plugin Video Renderer"}, [{description: "Google Talk Plugin Video Renderer", suffixes: "o1d", type: "application/o1d"}]),
            createPlugin({description: "Windows Activation Technologies Plugin for Mozilla", filename: "npWatWeb.dll", name: "Windows Activation Technologies"}, [{description: "Windows Activation Technologies", suffixes: "", type: "application/mozilla-wat-scriptable-plugin-11"}])
        ]
    }

    function _webkitURL(){
    }

    function isIncapsulated(html){
        return /_analytics_scr.src\s*=\s*'(\/_Incapsula[^']*)|<META[^>]+NAME="robots"[^>]*CONTENT="noindex,nofollow"[^>]*>/.test(html);
    }

    function executeScript(html){
        var paramNames = "window,document,navigator,webkitURL,location,parent,XMLHttpRequest";
        var paramValues = [_window,_document,_navigator,_webkitURL,_window.location,_window,_XMLHttpRequest];

        if(/<META[^>]+NAME="robots"[^>]*CONTENT="noindex,nofollow"[^>]*>/i.test(html)){ //Усиленная скриптовая проверка
			var obfuscatedScript = sumParam(html, null, null, /<script(?:[^>](?!src\s*=))*>([\s\S]*?)<\/script>/ig, null, null, create_aggregate_join('\n'));
        	safeEval(obfuscatedScript, paramNames, paramValues);
        	loadImages();
        	html = _AnyBalance.requestGet(_url, headers);
        }

        //А теперь надо проверить, не внедрен ли скрипт на страницу
        var jsurl = getParam(html, null, null, /_analytics_scr.src\s*=\s*'(\/_Incapsula[^']*)/);
        if(jsurl){
            js = _AnyBalance.requestGet(getBaseurl() + jsurl, headers);
        	safeEval(js, paramNames, paramValues);
        	loadImages();
        }

        if(_AnyBalance.getLevel() >= 9){
        	AnyBalance.saveCookies(/incap/i);
        	AnyBalance.saveData();
        }

        return html;
    }

    _window.parent = _window;

    if(_AnyBalance.getLevel() >= 9){
    	AnyBalance.restoreCookies(/incap/i);
    }

    return {
        document: _document,
        window: _window,

        isIncapsulated: isIncapsulated,
        executeScript: executeScript
    };
}