var g_baseurlLogin = 'http://login.mts.ru';

function checkLoginError(html, options) {
	var prefs = AnyBalance.getPreferences();
	var loginUrl = options.url;

	function processError(html){
        var error = sumParam(html, /var\s+(?:passwordErr|loginErr)\s*=\s*'([^']*)/g, replaceSlashes, null, aggregate_join);
        if(!error) //�� ���� ����� �����
        	error = getElement(html, /<[^>]+field-help/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /�����|�����/i.test(error));

        var error = getElement(html, /<div[^>]+b-page_error__msg[^>]*>/, replaceTagsAndSpaces);
        if(error)
        	throw new AnyBalance.Error(error);
	}

    processError(html);
    var img = getElement(html, /<[^>]+captcha-wrapper/i);
    if(img){
        img = getParam(img, /data:image\/\w+;base64,([^'"]+)/i, replaceHtmlEntities);
    }
    if(img && img.indexOf('iVBORw0KGgoAAAANSUhEUgAAANMAAAA6CAIAAAClLvvEAAAeQElEQVR42u3de7yVVZkH8NTQSi3N7uUltQuaoGFp') >= 0){
    	AnyBalance.trace('����� ��������. ���� � � ������ �����');
    	img = null;
    }
    if(!img){
    	img = getParam(html, /"(ZGF0YTppbWFnZS[^"]*)/);
    	if(img) img = Base64.decode(img);
    }
    if (!img) img=getParam(html,/<img id="captchaImage"\s*?src="([^"]+)/) 
    if(img){
    	img = getParam(img, /data:image\/\w+?(?:png)?;base64,([^'"]+)/i);
    }
    if(img) {
	    AnyBalance.trace('��� ������ �������� ����� :( ����');
	    var code = AnyBalance.retrieveCode('��� ������� ������ ����� ��� ����� � ������ �������, ����� �����������, ��� �� �� �����. ������� �������, ������� �� ������ �� ��������.', img);
	    var form = getElement(html, /<form[^>]+name="Login"/i);
	    if (!form) form=getElementById(html,'captchaForm');
	    var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken1')
                value = prefs.login;
            if (name == 'IDToken2')
            	value = code;
            return value;
        });

        AnyBalance.trace("��������� � �������� ������� � ������");
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        var er=getParam(html,/data-error="([^"]*)/);
        if (er) throw new AnyBalance.Error(er, true);
        fixCookies();

        // ���� ��� ����������� ������ 502, �� ���� ��������� ��� ��� ��� - ��� ��
        if (AnyBalance.getLastStatusCode() >= 500) {
            AnyBalance.trace("��� ������ 500 ��� ������� ������. ������� ��� �����...");
            html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
            fixCookies();
        }
        
		if(AnyBalance.getLastStatusCode() >= 500)
            throw new AnyBalance.Error("������ �� ������� ��� ��� ������� �����, ������ �� ���� ���������� ������! ����� ���������� �����...", allowRetry);

        if(isOnLogin() && getOrdinaryLoginForm(html)) { //������, ����� ����� �� ����������������
            html = loginOrdinaryForm(html, options);
        }

        if(AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0) { //���� ��� �� ��������������, ������, ��������� ������
        	processError(html);
        }
    }else if(/���\s*-\s*��������� ������/i.test(html)){
    	AnyBalance.trace('��� ����������� ���������� ������. ��������� ������');
	    var form = getElement(html, /<form[^>]+name="Login"/i);
	    var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken2')
                value = code;
            return value;
        });
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();

        if(/��� ������ �������/i.test(html)){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('��� ����������� ���������� ����� ������, �������������� ��������� ������� �� �������. ���� �������?');
        }

	    form = getElement(html, /<form[^>]+name="Login"/i);
	    var params = createFormParams(form);
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();
    }else{
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('�� ������� ����� �����. ���� �������?');
    }

    return html;
}

function redirectIfNeeded(html){
    if(/<body[^>]+onload[^>]+submit/i.test(html)){
    	AnyBalance.trace('������������ �������� ������...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	action = action.replace(/^https:\/\/login\.mts\.ru(?::443)?/, 'http://login.mts.ru'); 
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    	fixCookies();
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('������������ get ��������...');
    	redir = redir.replace(/^https:\/\/login\.mts\.ru/, 'http://login.mts.ru');
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestGet(joinUrl(url, redir), addHeaders({Refefer: url}));
    	fixCookies();
    }
    return html;
}

function isOnLogin(){
	return AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0;
}

function getOrdinaryLoginForm(html){
	return getElement(html, /<form[^>]+name="Login"/i);
}


function enterMtsLK(options) {
	var url = options.url || g_baseurlLogin;

    var html = AnyBalance.requestGet(url, g_headers);
    if(fixCookies()){
        AnyBalance.trace("���� ���������� �� �����...");
        html = AnyBalance.requestGet(AnyBalance.getLastUrl(), g_headers);
        fixCookies();
    }

    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("��� ������ 500. ������� ��� �����...");
        html = AnyBalance.requestGet(url, g_headers);
        fixCookies();
    }

    if (AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("������ �� ������� ���, ������ �� ���� ���������� ������. ����� ���������� �����...");

    if(/��������� ������ ��� ������� �����������/i.test(html)){
    	AnyBalance.trace('���� �������� :( �������� �������������� ������');
    	clearAllCookies();
    	html = AnyBalance.requestGet(url, g_headers);
    	fixCookies()
    }

    if(fixCookies()){
    	//���� ������������� ��������, ���� ���� ���� ����������
        AnyBalance.trace("���� ����������, ������������� ��������. ������� ��� �����...");
        html = AnyBalance.requestGet(AnyBalance.getLastUrl(), g_headers);
        fixCookies();
    }

    html = redirectIfNeeded(html); //������ ������ ���. �����, ���� ����������������.

    var loggedInNum = getParam(html, /���������� ���� � �������([\s\S]*?)<\/[bp]/i, replaceTagsAndSpaces);
    if(loggedInNum){
    	AnyBalance.trace('���������� ������������� ������������ �� ' + loggedInNum);
    	var form = getElement(html, /<form[^>]+name="Login"/i);
    	var submit;
    	if(!endsWith(loggedInNum.replace(/\D+/g, ''), options.login)){
    		AnyBalance.trace('� ��� ����� ����� ' + options.login + '. ������������...');
    		submit = 'Ignore';
    	}else{
    		AnyBalance.trace('� ��� ���� ����� � �����. �����������...');
    		submit = 'Login';
    	}

    	var params = createFormParams(form, function (params, input, name, value) {
        	if (name == 'IDButton')
        		value = submit;
		    return value;
		});
		html = AnyBalance.requestPost(AnyBalance.getLastUrl(), params, addHeaders({Referer: AnyBalance.getLastUrl()}));
        fixCookies();
    }

    if(isOnLogin()){
    	//�� �� ��� �� �������������� �� ������� ��������, ������, ���� ����������
    	options.html = html;
    	if(!options.url)
    		options.url = AnyBalance.getLastUrl();
    	html = enterMTS(options);
    }else{
    	AnyBalance.trace('�� �� �� �������� ������. ������ ���?');
    }

    if(isOnLogin()){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('�� ������ ����� � ������ �������');
    }

    return html;
}

function fixCookies(){
	//���� ��������� ������ ���� (������� �������)
	var cookies = AnyBalance.getCookies();
	var repaired = false;
	for(var i=0; i<cookies.length; ++i){
		var c = cookies[i];
		if(/^login|REDIRECT_BACK_SERVER_URL$/i.test(c.name) && !/^"/.test(c.value)){
			var newval = '"' + c.value + '"';
			AnyBalance.trace('���������� ���� ' + c.name + ' �� ' + newval);
			AnyBalance.setCookie(c.domain, c.name, newval, c);
			repaired = true;
		}
	}
	if(!AnyBalance.getCookie('login')){
		AnyBalance.setCookie('login.mts.ru', 'login', "\"https://login.mts.ru:443/amserver/UI/Login?service=lk&goto=http%3A%2F%2Flk.mts.ru%2F\"", {path: "/amserver/UI/Login"});
	}
	return repaired;
}

function saveLoginCookies(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setData('login', prefs.login + '-v1');
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function restoreLoginCookies(){
	var prefs = AnyBalance.getPreferences();
	var login = AnyBalance.getData('login');
	if(login === (prefs.login  + '-v1')){
		AnyBalance.restoreCookies();
	}
}

function loginOrdinaryForm(html, options){
	var prefs = AnyBalance.getPreferences();
    AnyBalance.trace('������� ������� ����� �����');
    var form = getOrdinaryLoginForm(html);
    var params = createFormParams(form, function (params, input, name, value) {
        var undef;
        if (name == 'IDToken1')
            value = options.login;
        else if (name == 'IDToken2')
            value = options.password;
        else if (name == 'noscript')
            value = undef; //������� �������
        else if (name == 'IDButton')
            value = 'Submit';
        return value;
    });

    var sitekey = getParam(form, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
    if(sitekey){
    	AnyBalance.trace('��� ������� ������� :(');
    	var recaptcha = solveRecaptcha('��� ������� ����� �������, ��� � ��� ����� ����� �������. ����������, ��������, ��� �� �� �����.', loginUrl, sitekey);
    	params.IDToken3 = recaptcha;
    }
    
    // AnyBalance.trace("Login params: " + JSON.stringify(params));
    AnyBalance.trace("��������� � �������� �������");
    html = AnyBalance.requestPost(options.url, params, addHeaders({Origin: g_baseurlLogin, Referer: options.url}));
    fixCookies();
    return html;
}

function enterMTS(options){
	var baseurl = options.baseurl || g_baseurl;
    var loginUrl = options.url = options.url || g_baseurlLogin + "/amserver/UI/Login?goto=" + baseurl;
    var allowRetry = options.allowRetry;

    var html = options.html;
    fixCookies();

    if(!html || !getOrdinaryLoginForm(html)){
        html = AnyBalance.requestGet(loginUrl, g_headers);
        fixCookies();
        if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace("��� ������ 500. ������� ��� �����...");
			html = AnyBalance.requestGet(loginUrl, g_headers);
			fixCookies();
		}
	    
        if(AnyBalance.getLastStatusCode() >= 500)
        	throw new AnyBalance.Error("������ �� ������� ���, ������ �� ���� ���������� ������. ����� ���������� �����...", allowRetry);
    }

    if(AnyBalance.getLastUrl().indexOf(baseurl) == 0){ //���� ��� ����� �������������� �� ������� ��������, ������, ��� ����������
		return html;
	}

	html = redirectIfNeeded(html);

    var form;
    if(form = getOrdinaryLoginForm(html)){  //������� ����� �����
    	html = loginOrdinaryForm(html, options);
    }else if(form = getElement(html, /<form[^>]+id="login-phone-form"/i)){       
    	AnyBalance.trace('������� ����. ����� �����');
        var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken1')
                value = options.login;
            return value;
        });
        
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();
    	
    	form = getElement(html, /<form[^>]+id="enter-password-form"/i);
    	if(!form){
    		var error = getElement(html, /<[^>]+intro-text/i, replaceTagsAndSpaces);
    		if(error)
    			throw new AnyBalance.Error(error, null, /�� ����������/i.test(error));
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('�� ������� ����� ����� ����� ������. ���� �������?');
    	}

        var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken1')
                value = options.login;
            else if (name == 'IDToken2')
                value = options.password;
            return value;
        });

        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();
    }else if(/bobcmn/i.test(html)){
    	throw new AnyBalance.Error('��� ���� ������ �� ��������������� �����. ����������, ���������� � ��������� ���, ��������� ��������� � ������������� ������������� ��������������� �������� �������� �� ��������. ��������� ��, ��� �� ������ ������� � ������� ���������, ������� �� ���������������� ������������ �������.');       
    }else{
    	if(!html)
    		throw new AnyBalance.Error('������ ������� ��� �������� ����������. ���������� ��� ��� �����');
    	if(/<h1[^>]*>\s*Request Error/i.test(html))
    		throw new AnyBalance.Error('������ ������� ��� �������� �� ��������. ���������� ��� ��� �����');
        AnyBalance.trace(html);
        throw new AnyBalance.Error("�� ������ ����� ����� �����! ���� �������?", allowRetry);
    }

    // ���� ��� ����������� ������ 502, �� ���� ��������� ��� ��� ��� - ��� ��
    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("��� ������ 500 ��� ������� ������. ������� ��� �����...");
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();
    }

	if(AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("������ �� ������� ��� ��� ������� �����, ������ �� ���� ���������� ������! ����� ���������� �����...", allowRetry);

    //���� �������������� � ������, ������, ������������. � ���� ���, �� �����-�� ��������
    if(isOnLogin())
		html = checkLoginError(html, options);

    if(isOnLogin()){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('�� ������ ����� � ������ �������. �� ��������� ��� �������� �� �����.', allowRetry);
    }

    return html;
}

