var g_baseurlLogin = 'http://login.mts.ru';
var g_savedData;

function checkLoginError(html, options) {
	var prefs = AnyBalance.getPreferences();
	var loginUrl = options.url;

	function processError(html){
        var error = sumParam(html, /var\s+(?:passwordErr|loginErr)\s*=\s*'([^']*)/g, replaceSlashes, null, aggregate_join);
        if(!error) //На корп форме входа
        	error = getElement(html, /<[^>]+field-help/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));

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
    	AnyBalance.trace('Капча спрятана. Ищем её в другом месте');
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
	    AnyBalance.trace('МТС решило показать капчу :( Жаль');
	    var code = AnyBalance.retrieveCode('МТС требует ввести капчу для входа в личный кабинет, чтобы подтвердить, что вы не робот. Введите символы, которые вы видите на картинке.', img);
	    var form = getElement(html, /<form[^>]+name="Login"/i);
	    if (!form) form=getElementById(html,'captchaForm');
	    var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken1')
                value = prefs.login;
            if (name == 'IDToken2')
            	value = code;
            return value;
        });

        AnyBalance.trace("Логинимся с заданным номером и капчей");
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        var er=getParam(html,/data-error="([^"]*)/);
        if (er) throw new AnyBalance.Error(er, true);
        fixCookies();

        // Бага при авторизации ошибка 502, но если запросить гет еще раз - все ок
        if (AnyBalance.getLastStatusCode() >= 500) {
            AnyBalance.trace("МТС вернул 500 при попытке логина. Пробуем ещё разок...");
            html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
            fixCookies();
        }
        
		if(AnyBalance.getLastStatusCode() >= 500)
            throw new AnyBalance.Error("Ошибка на сервере МТС при попытке зайти, сервер не смог обработать запрос! Можно попытаться позже...", allowRetry);

        if(isOnLogin() && getOrdinaryLoginForm(html)) { //Бывает, после капчи не переадресовывает
            html = loginOrdinaryForm(html, options);
        }

        if(AnyBalance.getLastUrl().indexOf(g_baseurlLogin) == 0) { //Если нас не переадресовали, значит, случилась ошибка
        	processError(html);
        }
    }else if(/МТС\s*-\s*Установка пароля/i.test(html)){
    	AnyBalance.trace('МТС потребовало установить пароль. Установим старый');
	    var form = getElement(html, /<form[^>]+name="Login"/i);
	    var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken2')
                value = code;
            return value;
        });
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();

        if(/Ваш пароль успешно/i.test(html)){
        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('МТС потребовала установить новый пароль, автоматическая установка старого не удалась. Сайт изменен?');
        }

	    form = getElement(html, /<form[^>]+name="Login"/i);
	    var params = createFormParams(form);
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();
    }else{
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти капчу. Сайт изменен?');
    }

    return html;
}

function redirectIfNeeded(html){
    if(/<body[^>]+onload[^>]+submit/i.test(html)){
    	AnyBalance.trace('Потребовался редирект формой...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	action = action.replace(/^https:\/\/login\.mts\.ru(?::443)?/, 'http://login.mts.ru'); 
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    	fixCookies();
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('Потребовался get редирект...');
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

function loadProtectedPage(fromUrl, headers){
    const url = fromUrl.startsWith(g_baseurlLogin) ? fromUrl : g_baseurlLogin + '/amserver/UI/Login';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html)) {
        AnyBalance.trace("Требуется обойти QRATOR");
        clearAllCookies();

        const bro = new BrowserAPI({
            userAgent: headers["User-Agent"],
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico)/.toString(),
                action: 'abort',
            }, {
                url: /.*/.toString(),
                action: 'request',
            }],
            additionalRequestHeaders: [
		{
                    headers: {
			'User-Agent': headers["User-Agent"]

		    }
		}
            ],
            //debug: true
        });

        const r = bro.open(url);
        try {
            bro.waitForLoad(r.page);
            html = bro.content(r.page).content;
            const cookies = bro.cookies(r.page, url);
            BrowserAPI.useCookies(cookies);
        } finally {
            bro.close(r.page);
        }

        if(/__qrator|Access to [^<]* is forbidden|Доступ к сайту [^<]* запрещен/.test(html))
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита QRATOR успешно пройдена");

        if(!g_savedData) {
            const prefs = AnyBalance.getPreferences();
            g_savedData = new SavedData('mts', prefs.login);
        }

        g_savedData.setCookies();
        g_savedData.save();

    }

    if(!fromUrl.startsWith(g_baseurlLogin))
        html = AnyBalance.requestGet(fromUrl, headers);

    return html;
}

function enterMtsLK(options) {
	var url = options.url || g_baseurlLogin;

    var html = loadProtectedPage(url, g_headers);

    if(fixCookies()){
        AnyBalance.trace("Куки исправлены на входе...");
        html = AnyBalance.requestGet(AnyBalance.getLastUrl(), g_headers);
        fixCookies();
    }

    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("МТС вернул 500. Пробуем ещё разок...");
        html = AnyBalance.requestGet(url, g_headers);
        fixCookies();
    }

    if (AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("Ошибка на сервере МТС, сервер не смог обработать запрос. Можно попытаться позже...");

    if(/Произошла ошибка при попытке авторизации/i.test(html)){
    	AnyBalance.trace('Куки протухли :( Придется авторизоваться заново');
    	clearAllCookiesExceptProtection();
    	html = AnyBalance.requestGet(url, g_headers);
    	fixCookies()
    }

    if(fixCookies()){
    	//Надо перезагрузить страницу, если куки были исправлены
        AnyBalance.trace("Куки исправлены, перезагружаем страницу. Пробуем ещё разок...");
        html = AnyBalance.requestGet(AnyBalance.getLastUrl(), g_headers);
        fixCookies();
    }

    html = redirectIfNeeded(html); //Иногда бывает доп. форма, надо переадресоваться.

    var loggedInNum = getParam(html, /Продолжить вход с номером([\s\S]*?)<\/[bp]/i, replaceTagsAndSpaces);
    if(loggedInNum){
    	AnyBalance.trace('Предлагает автоматически залогиниться на ' + loggedInNum);
    	var form = getElement(html, /<form[^>]+name="Login"/i);
    	var submit;
    	if(!endsWith(loggedInNum.replace(/\D+/g, ''), options.login)){
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
        fixCookies();
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
		if(/^login|REDIRECT_BACK_SERVER_URL$/i.test(c.name) && !/^"/.test(c.value)){
			var newval = '"' + c.value + '"';
			AnyBalance.trace('Исправляем куки ' + c.name + ' на ' + newval);
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
    AnyBalance.trace('Найдена обычная форма входа');
    var form = getOrdinaryLoginForm(html);
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
    html = AnyBalance.requestPost(options.url, params, addHeaders({Origin: g_baseurlLogin, Referer: options.url}));

    var msocookie = AnyBalance.getCookie('MTSWebSSO');
    AnyBalance.setCookie('.mts.ru', 'MTSWebSSO', msocookie);

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
        html = loadProtectedPage(loginUrl, g_headers);
        fixCookies();
        if(AnyBalance.getLastStatusCode() >= 500){
            AnyBalance.trace("МТС вернул 500. Пробуем ещё разок...");
			html = AnyBalance.requestGet(loginUrl, g_headers);
			fixCookies();
		}
	    
        if(AnyBalance.getLastStatusCode() >= 500)
        	throw new AnyBalance.Error("Ошибка на сервере МТС, сервер не смог обработать запрос. Можно попытаться позже...", allowRetry);
    }

    if(AnyBalance.getLastUrl().indexOf(baseurl) == 0){ //Если нас сразу переадресовали на целевую страницу, значит, уже залогинены
		return html;
	}

	html = redirectIfNeeded(html);

    var form;
    if(form = getOrdinaryLoginForm(html)){  //Обычная форма входа
    	html = loginOrdinaryForm(html, options);
    }else if(form = getElement(html, /<form[^>]+id="login-phone-form"/i)){       
    	AnyBalance.trace('Найдена корп. форма входа');
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
    			throw new AnyBalance.Error(error, null, /не существует/i.test(error));
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Не удалось найти форму ввода пароля. Сайт изменен?');
    	}

        var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken1')
                value = options.login;
            else if (name == 'IDToken2')
                value = options.password;
            return value;
        });

        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        var msocookie = AnyBalance.getCookie('MTSWebSSO');
        AnyBalance.setCookie('.mts.ru', 'MTSWebSSO', msocookie);
        fixCookies();
    }else if(/bobcmn/i.test(html)){
    	throw new AnyBalance.Error('МТС ввел защиту от автоматического входа. Пожалуйста, обратитесь в поддержку МТС, составьте обращение о невозможности использования третьесторонних программ слежения за балансом. Напомните им, что вы можете перейти к другому оператору, который не противодействует отслеживанию баланса.');       
    }else{
    	if(!html)
    		throw new AnyBalance.Error('Личный кабинет МТС временно недоступен. Попробуйте ещё раз позже');
    	if(/<h1[^>]*>\s*Request Error/i.test(html))
    		throw new AnyBalance.Error('Личный кабинет МТС временно не работает. Попробуйте ещё раз позже');
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удаётся найти форму входа! Сайт изменен?", allowRetry);
    }

    // Бага при авторизации ошибка 502, но если запросить гет еще раз - все ок
    if (AnyBalance.getLastStatusCode() >= 500) {
        AnyBalance.trace("МТС вернул 500 при попытке логина. Пробуем ещё разок...");
        html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
        fixCookies();
    }

	if(AnyBalance.getLastStatusCode() >= 500)
        throw new AnyBalance.Error("Ошибка на сервере МТС при попытке зайти, сервер не смог обработать запрос! Можно попытаться позже...", allowRetry);

    //Если переадресовали с логина, значит, залогинились. А если нет, то какие-то проблемы
    if(isOnLogin())
		html = checkLoginError(html, options);

    if(isOnLogin()){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся зайти в личный кабинет. Он изменился или проблемы на сайте.', allowRetry);
    }

    return html;
}

function clearAllCookiesExceptProtection(){
    clearAllCookies(c => !/qrator|StickyID/i.test(c.name) && !/^TS0/i.test(c.name));
}