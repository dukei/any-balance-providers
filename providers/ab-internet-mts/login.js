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

function enterMTS(options){
	var baseurl = options.baseurl || g_baseurl;
    var loginUrl = options.url || g_baseurlLogin + "/amserver/UI/Login?service=" + (options.service || 'lk') + '&goto=' + baseurl + '/';
    var allowRetry = options.allowRetry;

    var html = options.html;
    if(!html || !/<form[^>]+name="Login"/i.test(html)){
        html = AnyBalance.requestGet(loginUrl, g_headers);
        if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace("МТС вернул 500. Пробуем ещё разок...");
			html = AnyBalance.requestGet(loginUrl, g_headers);
		}
	    
        if(AnyBalance.getLastStatusCode() >= 500)
        	throw new AnyBalance.Error("Ошибка на сервере МТС, сервер не смог обработать запрос. Можно попытаться позже...", allowRetry);
    }

    if(AnyBalance.getLastUrl().indexOf(baseurl) == 0) //Если нас сразу переадресовали на целевую страницу, значит, уже залогинены
		return html;

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
    if(AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0)
		html = checkLoginError(html, loginUrl);

    if(AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся зайти в личный кабинет. Он изменился или проблемы на сайте.', allowRetry);
    }

    return html;
}
