var g_baseurlLogin = 'https://login.mts.ru';

function checkLoginError(html, loginUrl) {
	function processError(html){
        var error = sumParam(html, null, null, /var\s+(?:passwordErr|loginErr)\s*=\s*'([^']*)/g, replaceSlashes, null, aggregate_join);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверный пароль/i.test(error));

        var error = getElement(html, /<div[^>]+b-page_error__msg[^>]*>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
        	throw new AnyBalance.Error(error);
	}

    processError(html);
    var img = getParam(html, null, null, /<img[^>]+id="kaptchaImage"[^>]*src="data:image\/\w+;base64,([^"]+)/i, null, html_entity_decode);

	if(img) {
	    AnyBalance.trace('МТС решило показать капчу :( Жаль');
	    var code = AnyBalance.retrieveCode('МТС требует ввести капчу для входа в личный кабинет, чтобы подтвердить, что вы не робот. Введите символы, которые вы видите на картинке.', img);
	    var form = getParam(html, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
	    var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken2')
                value = code;
            return value;
        });

        AnyBalance.trace("Логинимся с заданным номером и капчей");
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        
        // Бага при авторизации ошибка 502, но если запросить гет еще раз - все ок
        if (AnyBalance.getLastStatusCode() >= 500) {
            AnyBalance.trace("МТС вернул 500 при попытке логина. Пробуем ещё разок...");
            html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        }
        
		if(AnyBalance.getLastStatusCode() >= 500)
            throw new AnyBalance.Error("Ошибка на сервере МТС при попытке зайти, сервер не смог обработать запрос! Можно попытаться позже...", allowRetry);

        if(AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0) { //Если нас не переадресовали, значит, случилась ошибка
        	processError(html);
        }
    }

    return html;
}

function redirectIfNeeded(html){
    if(/<body[^>]+onload[^>]+submit/i.test(html)){
    	AnyBalance.trace('Потребовался редирект формой...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('Потребовался get редирект...');
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestGet(joinUrl(url, redir), addHeaders({Refefer: url}));
    }
    return html;
}

function isOnLogin(){
	return AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0;
}

function enterMtsLK(options) {
	var baseurl = options.baseurl || g_baseurl;

    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("МТС вернул 500. Пробуем ещё разок...");
        html = AnyBalance.requestGet(baseurl, g_headers);
    }

    if (AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("Ошибка на сервере МТС, сервер не смог обработать запрос. Можно попытаться позже...");

    if(fixCookies()){
    	//Надо перезагрузить страницу, если куки были исправлены
        AnyBalance.trace("Куки исправлены, перезагружаем страницу. Пробуем ещё разок...");
        html = AnyBalance.requestGet(AnyBalance.getLastUrl(), g_headers);
    }

    html = redirectIfNeeded(html); //Иногда бывает доп. форма, надо переадресоваться.

    var loggedInNum = getParam(html, /Продолжить вход[^<]+с номером\s*<b[^>]*>([\s\S]*?)<\/b>/i, [replaceTagsAndSpaces, /\D+/g, '']);
    if(loggedInNum){
    	AnyBalance.trace('Предлагает автоматически залогиниться на ' + loggedInNum);
    	var form = getElement(html, /<form[^>]+name="Login"/i);
    	var submit;
    	if(options.login != loggedInNum){
    		AnyBalance.trace('А нам нужен номер ' + options.login + '. Отказываемся...');
    		submit = 'Ignore';
    	}else{
    		AnyBalance.trace('А нам этот номер и нужен. Соглашаемся...');
    		submit = 'Login';
    	}

    	var params = createFormParams(form, function (params, input, name, value) {
        	if (name == 'IDButton')
        		value = submit;
		    return value;
		});
		html = AnyBalance.requestPost(AnyBalance.getLastUrl(), params, addHeaders({Referer: AnyBalance.getLastUrl()}));
    }

    if(isOnLogin()){
    	//Мы всё еще не переадресованы на целевую страницу, значит, надо логиниться
    	options.html = html;
    	if(!options.url)
    		options.url = AnyBalance.getLastUrl();
    	html = enterMTS(options);
    }else{
    	AnyBalance.trace('Мы не на странице логина. Внутри уже?');
    }

    if(isOnLogin()){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удаётся зайти в личный кабинет');
    }

    return html;
}

function fixCookies(){
	//Надо исправить работу куки (пропали кавычки)
	var cookies = AnyBalance.getCookies();
	var repaired = false;
	for(var i=0; i<cookies.length; ++i){
		var c = cookies[i];
		if(/^login$/i.test(c.name) && !/^"/.test(c.value)){
			var newval = '"' + c.value + '"';
			AnyBalance.trace('Исправляем куки ' + c.name + ' на ' + newval);
			AnyBalance.setCookie(c.domain, c.name, newval, c);
			repaired = true;
		}
	}
	return repaired;
}

function saveLoginCookies(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setData('login', prefs.login);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
}

function restoreLoginCookies(){
	var prefs = AnyBalance.getPreferences();
	var login = AnyBalance.getData('login');
	if(login == prefs.login){
		AnyBalance.restoreCookies();
	}
}

function enterMTS(options){
	var baseurl = options.baseurl || g_baseurl;
    var loginUrl = options.url || g_baseurlLogin + "/amserver/UI/Login?goto=" + baseurl;
    var allowRetry = options.allowRetry;

    var html = options.html;
    fixCookies();

    if(!html || !/<form[^>]+name="Login"/i.test(html)){
        html = AnyBalance.requestGet(loginUrl, g_headers);
        if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace("МТС вернул 500. Пробуем ещё разок...");
			html = AnyBalance.requestGet(loginUrl, g_headers);
		}
	    
        if(AnyBalance.getLastStatusCode() >= 500)
        	throw new AnyBalance.Error("Ошибка на сервере МТС, сервер не смог обработать запрос. Можно попытаться позже...", allowRetry);
    }

    if(AnyBalance.getLastUrl().indexOf(baseurl) == 0){ //Если нас сразу переадресовали на целевую страницу, значит, уже залогинены
		return html;
	}

	html = redirectIfNeeded(html);

    var form = getParam(html, null, null, /<form[^>]+name="Login"[^>]*>([\s\S]*?)<\/form>/i);
    if (!form) {
    	if(!html)
    		throw new AnyBalance.Error('Личный кабинет МТС временно недоступен. Попробуйте ещё раз позже');
    	if(/<h1[^>]*>\s*Request Error/i.test(html))
    		throw new AnyBalance.Error('Личный кабинет МТС временно не работает. Попробуйте ещё раз позже');
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся найти форму входа! Сайт изменен?", allowRetry);
    }

    var params = createFormParams(form, function (params, input, name, value) {
        var undef;
        if (name == 'IDToken1')
            value = options.login;
        else if (name == 'IDToken2')
            value = options.password;
        else if (name == 'noscript')
            value = undef; //Снимаем галочку
        else if (name == 'IDButton')
            value = 'Submit';
        return value;
    });

    var sitekey = getParam(form, /data-sitekey="([^"]*)/i, replaceHtmlEntities);
    if(sitekey){
    	AnyBalance.trace('МТС требует рекапчу :(');
    	var recaptcha = solveRecaptcha('МТС требует ввода рекапчи, как и при входе через браузер. Пожалуйста, докажите, что вы не робот.', loginUrl, sitekey);
    	params.IDToken3 = recaptcha;
    }
    
    // AnyBalance.trace("Login params: " + JSON.stringify(params));
    AnyBalance.trace("Логинимся с заданным номером");
    html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));

    // Бага при авторизации ошибка 502, но если запросить гет еще раз - все ок
    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("МТС вернул 500 при попытке логина. Пробуем ещё разок...");
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
    }

	if(AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("Ошибка на сервере МТС при попытке зайти, сервер не смог обработать запрос! Можно попытаться позже...", allowRetry);

    //Если переадресовали с логина, значит, залогинились. А если нет, то какие-то проблемы
    if(isOnLogin())
		html = checkLoginError(html, loginUrl);

    if(isOnLogin()){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся зайти в личный кабинет. Он изменился или проблемы на сайте.', allowRetry);
    }

    return html;
}
