var g_baseurlLogin = 'https://login.mts.ru';
var g_savedData;

function checkLoginError(html, options) {
	var prefs = AnyBalance.getPreferences();
	var loginUrl = options.url;

	function processError(html){
        var error = sumParam(html, /var\s+(?:passwordErr|loginErr)\s*=\s*'([^']*)/g, replaceSlashes, null, aggregate_join);
        if(!error) //На корп форме входа
        	error = getElement(html, /<[^>]+errorText/i, replaceTagsAndSpaces);
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
	const url = fromUrl.startsWith(g_baseurlLogin) ? fromUrl : 'https://auth-lk.ssl.mts.ru/account/login?goto=https://lk.mts.ru/';

    var html = AnyBalance.requestGet(url, headers);
    
	if(/__qrator/.test(html)) {
        AnyBalance.trace("Требуется обойти QRATOR");
		if(!AnyBalance.getCapabilities().clientOkHttp && !AnyBalance.getCapabilities().clientDebugger)
        	throw new AnyBalance.Error('Для работы провайдера требуется обновить приложение. Новая версия AnyBalance доступна на RuStore');
        AnyBalance.setOptions({CLIENT: 'okhttp'});
		clearAllCookies();

        const bro = new BrowserAPI({
            provider: 'mts-login-q4',
            userAgent: headers["User-Agent"],
            headful: true,
			//noInterception: true,
            userInteraction: true,
            singlePage: true,
            rules: [{
                resType: /^(image|stylesheet|font)$/.toString(),
                action: 'abort',
            }, {
		        url: /_qrator\/qauth(?:_\w+)*\.js/.toString(),
                action: 'cache',
                valid: 360*1000
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                resType: /^(image|stylesheet|font|script)$/i.toString(),
                action: 'abort',
            }, {
                url: /\.(png|jpg|ico|svg)/.toString(),
                action: 'abort',
            }, {
				url: /\.mts\.ru/.toString(),
                action: 'request',
			}, {
                url: /.*/.toString(),
                action: 'abort',
            }],
            additionalRequestHeaders: [{
                headers: {
			        'User-Agent': headers["User-Agent"]
                }
		    }],
            debug: AnyBalance.getPreferences().debug
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
        html = AnyBalance.requestGet(url, g_headers);
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
		if(/\/amserver\/NUI\//i.test(AnyBalance.getLastUrl())){
			AnyBalance.trace('МТС направил на новый вход NUI');
			options.ref = AnyBalance.getLastUrl();
			options.statetrace = getParam(AnyBalance.getLastUrl(), /statetrace=([\s\S]*?)(?:&|$)/i, replaceHtmlEntities);
			if(options.statetrace){ // Получили statetrace, формируем url для логина
				options.url = 'https://login.mts.ru/amserver/wsso/authenticate?realm=%2Fusers&client_id=LK&authIndexType=service&authIndexValue=login-spa&goto=https%3A%2F%2Flogin.mts.ru%2Famserver%2Foauth2%2Fauthorize%3Fscope%3Dprofile%2520account%2520phone%2520slaves%253Aall%2520slaves%253Aprofile%2520sub%2520email%2520user_address%2520identity_doc%2520lbsv%2520sso%2520openid%26response_type%3Dcode%26client_id%3DLK%26state%3D' + options.statetrace + '%26redirect_uri%3Dhttps%253A%252F%252Fauth-lk.ssl.mts.ru%252Faccount%252Fcallback%252Flogin&statetrace=' + options.statetrace;
			}else{ // Используем стандартный url для логина
				options.url = 'https://login.mts.ru/amserver/wsso/authenticate?authIndexType=service&authIndexValue=login-spa';
			}
			html = enterLKNUI(options);
		}else{
			AnyBalance.trace('МТС направил на старый вход UI');
			html = enterMTS(options);
		}
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
	
	var loginFormatted = options.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '$1 $2-$3-$4');

    var form;
    if(form = getOrdinaryLoginForm(html)){  //Обычная форма входа
    	html = loginOrdinaryForm(html, options);
    }else if(form = (getElement(html, /<form[^>]+class="section__form form -loginForm"/i) || getElement(html, /<form[^>]+class="section__passwordForm passwordForm "/i))){       
		AnyBalance.trace('Найдена корп. форма входа');
        loginUrl = AnyBalance.getLastUrl();
		
		if(form = getElement(html, /<form[^>]+class="section__form form -loginForm"/i)){ // Может сразу выкатить форму ввода пароля, проверяем на наличие формы логина
		    var params = createFormParams(form, function (params, input, name, value) {
                if (name == 'login'){
				    value = loginFormatted;
			    }else if (name == 'IDToken1'){
                    value = options.login;
			    }
			    
                return value;
            });
            
            html = AnyBalance.requestPost(loginUrl, params, addHeaders({Origin: g_baseurlLogin, Referer: loginUrl}));
            fixCookies();
		}
    	
    	form = getElement(html, /<form[^>]+class="section__passwordForm passwordForm "/i);
		if(!form){
    		var error = getElement(html, /<[^>]+errorText/i, replaceTagsAndSpaces);
    		if(error)
    			throw new AnyBalance.Error(error, null, /пользователь|не существует/i.test(error));
    		if(/codeCheckForm/i.test(html))
    			throw new AnyBalance.Error('Личный кабинет для указанного номера телефона не зарегистрирован!', null, true);
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Не удалось найти форму ввода пароля. Сайт изменен?');
    	}

        var params = createFormParams(form, function (params, input, name, value) {
            if (name == 'IDToken1')
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

function enterLKUI(html, options){
	var prefs = AnyBalance.getPreferences();

	var loginFormatted = options.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '$1 $2-$3-$4');
	
	if(/captchaForm/i.test(html)){
		AnyBalance.trace('МТС затребовал капчу');
		var form = getElement(html, /<form[^>]+captchaForm[^>]*>/i);
	    if(!form){
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось найти форму для ввода капчи. Сайт изменен?');
        }
	    
		var img = getParam(form, /data:image\/\w+?(?:png)?;base64,([^"]+)/i);
		var captcha = AnyBalance.retrieveCode('МТС требует ввести капчу для входа в личный кабинет, чтобы подтвердить, что вы не робот. Пожалуйста, введите символы с картинки', img);
		
		var params = createFormParams(form, function (params, input, name, value) {
            var undef;
	        if (name == 'IDToken2')
                value = captcha;
            else if (name == 'noscript')
                value = undef; //Снимаем галочку
        
            return value;
        });
        
		// Отправляем капчу
        html = AnyBalance.requestPost('https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession', params, addHeaders({
        	Origin: 'https://login.mts.ru',
	    	Referer: 'https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession'
	    }));
		
		if (!html || AnyBalance.getLastStatusCode() > 400) { // Через VPN иногда не пускает с ошибкой 403. Оповещаем, чтобы не смущать отсутствием формы 
            throw new AnyBalance.Error('Личный кабинет МТС временно недоступен. Попробуйте ещё раз позже');
	    }
	
	    if(/captchaForm/i.test(html)){
	    	var form = getElement(html, /<form[^>]+captchaForm[^>]*>/i);
            var error = getParam(form, null, null, /class="errorText"[\s\S]*?data-error="*>?([\s\S]*?)[">]*?<\/p>/i, replaceTagsAndSpaces);
            if (error){
                throw new AnyBalance.Error (error, null, /код/i.test(error));
            }
           	
            AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
	}
	
	if(/loginForm/i.test(html)){ // Ввод номера
	    var form = getElement(html, /<form[^>]+loginForm[^>]*>/i);
	    if(!form){
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось найти форму для ввода номера. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function (params, input, name, value) {
            var undef;
	        if (name == 'login')
                value = loginFormatted;
            else if (name == 'IDToken1')
                value = options.login;
            else if (name == 'IDToken2')
                value = options.password;
            else if (name == 'noscript')
                value = undef; //Снимаем галочку
        
            return value;
        });
    
        // Отправляем номер телефона
        html = AnyBalance.requestPost('https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession', params, addHeaders({
        	Origin: 'https://login.mts.ru',
	    	Referer: 'https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession'
	    }));
	}
    
	var form = getElement(html, /<form[^>]*>/i); // devicePrint
	if(!form){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму для ввода devicePrint. Сайт изменен?');
    }

	var params = createFormParams(form, function (params, input, name, value) {
        var undef;
	    if (name == 'login')
            value = loginFormatted;
        else if (name == 'IDToken1')
            value = options.login;
        else if (name == 'IDToken2')
            value = '{"screen":{"screenWidth":1600,"screenHeight":900,"screenColourDepth":24},"userAgent":"Mozilla/5.0+(Windows+NT+10.0;+WOW64)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/126.0.0.0+Safari/537.36","platform":"Win32","language":"ru","timezone":{"timezone":-180},"plugins":{"installedPlugins":"internal-pdf-viewer;internal-pdf-viewer;internal-pdf-viewer;internal-pdf-viewer;internal-pdf-viewer;"},"fonts":{"installedFonts":"cursive;monospace;serif;sans-serif;fantasy;default;Arial;Arial+Black;Arial+Narrow;Bookman+Old+Style;Bradley+Hand+ITC;Century;Century+Gothic;Comic+Sans+MS;Courier;Courier+New;Georgia;Impact;Lucida+Console;Monotype+Corsiva;Papyrus;Tahoma;Times;Times+New+Roman;Trebuchet+MS;Verdana;"},"appName":"Netscape","appCodeName":"Mozilla","appVersion":"5.0+(Windows+NT+10.0;+WOW64)+AppleWebKit/537.36+(KHTML,+like+Gecko)+Chrome/126.0.0.0+Safari/537.36","product":"Gecko","productSub":"20030107","vendor":"Google+Inc."}';
        else if (name == 'noscript')
            value = undef; //Снимаем галочку
        
        return value;
    });

    // Теперь МТС ещё и devicePrint требует. Отправляем
    html = AnyBalance.requestPost('https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession', params, addHeaders({
    	Origin: 'https://login.mts.ru',
		Referer: 'https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession'
	}));
	
	if(/новый пользователь|Разблокировать/i.test(html)){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Ваш номер не зарегистрирован в МТС или доступ к нему заблокирован. Пожалуйста, перейдите на страницу авторизации https://login.mts.ru/amserver/UI/Login через браузер и выполните действия по регистрации или восстановлению доступа', null, true);
    }
	
	if(/passwordForm/i.test(html)){
	    var form = getElement(html, /<form[^>]+passwordForm[^>]*>/i);
	    if(!form){
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось найти форму для ввода пароля. Сайт изменен?');
        }

        var params = createFormParams(form, function (params, input, name, value) {
            var undef;
	        if (name == 'login')
                value = loginFormatted;
            else if (name == 'IDToken1')
                value = options.login;
            else if (name == 'IDToken2')
                value = options.password;
            else if (name == 'noscript')
                value = undef; //Снимаем галочку
		
            return value;
        });
    
        // Проверка пароля
        html = AnyBalance.requestPost('https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession', params, addHeaders({
	    	Origin: 'https://login.mts.ru',
	    	Referer: 'https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession'
	    }));
	
	    if(/passwordForm/i.test(html)){
	    	var form = getElement(html, /<form[^>]+passwordForm[^>]*>/i);
            var error = getParam(form, null, null, /class="errorText"[\s\S]*?data-error="*>?([\s\S]*?)[">]*?<\/p>/i, replaceTagsAndSpaces);
            if (error){
                throw new AnyBalance.Error (error, null, /парол/i.test(error));
            }
            	
            AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
	}
	
	if(/codeCheckForm/i.test(html)){
		AnyBalance.trace('МТС запросил проверку с помощью кода из SMS');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7 ' + loginFormatted + '.\n\nЕсли вы не хотите постоянно вводить SMS-пароли при входе, выберите способ входа "Пароль" в настройках безопасности вашего личного кабинета МТС', null, {inputType: 'number', time: 300000});
	    var form = getElement(html, /<form[^>]+codeCheckForm[^>]*>/i);
	    if(!form){
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось найти форму для ввода кода из SMS. Сайт изменен?');
        }

        var params = createFormParams(form, function (params, input, name, value) {
            var undef;
	        if (name == 'IDToken1')
                value = code;
            else if (name == 'noscript')
                value = undef; //Снимаем галочку
		
            return value;
        });
    
        // Проверка пароля
        html = AnyBalance.requestPost('https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession', params, addHeaders({
	    	Origin: 'https://login.mts.ru',
	    	Referer: 'https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession'
	    }));
	
	    if(/codeCheckForm/i.test(html)){
	    	var form = getElement(html, /<form[^>]+codeCheckForm[^>]*>/i);
            var error = getParam(form, null, null, /class[^>]+errorText"[\s\S]*?oneLine"*>?([\s\S]*?)[">]*?<\/span>/i, replaceTagsAndSpaces);
            if (error){
                throw new AnyBalance.Error (error, null, /код/i.test(error));
            }
			
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
	}
    
	var form = getElement(html, /<form[^>]+gaForm[^>]*>/i); // Логинимся наконец
	if(!form){
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    var params = createFormParams(form, function (params, input, name, value) {
        var undef;
	    if (name == 'login')
            value = loginFormatted;
        else if (name == 'IDToken1')
            value = options.login;
        else if (name == 'IDToken2')
            value = options.password;
        else if (name == 'noscript')
            value = undef; //Снимаем галочку

        return value;
    });
    
    // Логинимся с заданным номером
    html = AnyBalance.requestPost('https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession', params, addHeaders({
		Origin: 'https://login.mts.ru',
		Referer: 'https://login.mts.ru/amserver/UI/Login?no-config&arg=newsession'
	}));
    
    return html;
}

function enterLKNUI(options){
	var baseurl = options.baseurl || g_baseurl;
    var loginUrl = options.url || g_baseurlLogin + "/amserver/wsso/authenticate?authIndexType=service&authIndexValue=login-spa";
	var loginRef = options.ref || g_baseurlLogin + "/amserver/wsso/authenticate?authIndexType=service&authIndexValue=login-spa";
    var allowRetry = options.allowRetry;
	
	var recipient = getParam(options.login, null, null, null, [/.*(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4']);
	
	var headers = addHeaders({
		'Accept': '*/*',
        'Accept-Api-Version': 'resource=4.0, protocol=1.0',
		'Content-Type': 'application/json;charset=UTF-8',
		'Origin': 'https://login.mts.ru',
		'Referer': loginRef
	});
	
	var html = AnyBalance.requestPost(loginUrl, null, addHeaders(headers));
	
	if (!html || AnyBalance.getLastStatusCode() >= 500) {
        throw new AnyBalance.Error('Личный кабинет МТС временно недоступен. Попробуйте ещё раз позже.', allowRetry);
	}
	
	var json = getJson(html);
//	AnyBalance.trace('Проверка доступа: ' + JSON.stringify(json));

    if(!json.header){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся зайти в личный кабинет. Он изменился или проблемы на сайте.', allowRetry);
    }
	
	if (json.header)
		AnyBalance.trace('Progress header: ' + json.header);
	
	if (json.header == "device-match-hold") {
		var params = json;
		params.callbacks[0].input[0].value = '{"screen":{"screenWidth":1600,"screenHeight":900,"screenColourDepth":24},"userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36","platform":"Win32","language":"ru","timezone":{"timezone":-180},"plugins":{"installedPlugins":"internal-pdf-viewer;internal-pdf-viewer;internal-pdf-viewer;internal-pdf-viewer;internal-pdf-viewer;"},"fonts":{"installedFonts":"cursive;monospace;serif;sans-serif;fantasy;default;Arial;Arial Black;Arial Narrow;Bookman Old Style;Bradley Hand ITC;Century;Century Gothic;Comic Sans MS;Courier;Courier New;Georgia;Impact;Lucida Console;Monotype Corsiva;Papyrus;Tahoma;Times;Times New Roman;Trebuchet MS;Verdana;"},"appName":"Netscape","appCodeName":"Mozilla","appVersion":"5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36","product":"Gecko","productSub":"20030107","vendor":"Google Inc."}';
		params.callbacks[2].input[0].value = "true";
		params.callbacks[3].input[0].value = "windows";
		params.callbacks[4].input[0].value = "Ключ на Windows в Chrome";
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Отправка фингерпринта: ' + JSON.stringify(json));
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
	}
	
	if (json.header == "verify-captcha") {
		AnyBalance.trace('МТС затребовал капчу');
		var data = json.callbacks[0].output[0].value;
		var img = getParam(data, /data:image\/\w+?(?:png)?;base64,([^"]+)/i);
		var captcha = AnyBalance.retrieveCode('МТС требует ввести капчу для входа в личный кабинет, чтобы подтвердить, что вы не робот. Пожалуйста, введите символы с картинки', img);
		
		var params = json;
		params.callbacks[0].output[0].value = data;
		params.callbacks[1].input[0].value = captcha;
		params.callbacks[2].input[0].value = "1";
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Отправка капчи: ' + JSON.stringify(json));
        
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
		
		if (json.header == "verify-captcha") {
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Неверный код! Попробуйте еще раз', allowRetry);
	    }
	}
	
	if (json.header == "radius-frontend-request") {
		var params = json;
		params.callbacks[0].input[0].value = "0";
		params.callbacks[2].input[0].value = "1";
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//        AnyBalance.trace('Проверка окружения: ' + JSON.stringify(json));
        
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
	}
	
	if (json.header == "confirm-network-phone") {
		var params = json;
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Подтверждение сети: ' + JSON.stringify(json));
	    
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
	}
	
	if (json.header == "network-header-resource" || json.header == "network-header-resource-v1") {
		var params = json;
		params.callbacks[0].input[0].value = "1";
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Проверка хедеров сети: ' + JSON.stringify(json));
	    
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
	}
			
	if (json.header == "network-header" || json.header == "network-header-v1") {
		var params = json;
		params.callbacks[1].input[0].value = "1";
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//		AnyBalance.trace('Проверка сети МТС: ' + JSON.stringify(json));
        
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
	}
	    
	if (json.header == "enter-phone") {
		var params = json;
		params.callbacks[0].input[0].value = "7" + options.login;
		params.callbacks[1].input[0].value = "1";
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//	    AnyBalance.trace('Отправка номера телефона: ' + JSON.stringify(json));
        
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
		
		if (json.header == "enter-phone") {
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Неверный номер телефона!', allowRetry);
	    }
		
		if (json.header == "lock-change-owner") {
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Номер заблокирован!', allowRetry);
	    }
		
		if (json.header == "passkey-start-registration") {
			AnyBalance.trace('МТС предложил установить ключ доступа. Отказываемся...');
		    var params = json;
            params.callbacks[0].input[0].value = "0";
		    
		   html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	        
	        var json = getJson(html);
//	        AnyBalance.trace('Отказ от ключа доступа: ' + JSON.stringify(json));
	        
		    if (json.header)
		        AnyBalance.trace('Progress header: ' + json.header);
	    }
	}
		
	if (json.header == "verify-password") {
	    var params = json;
		params.callbacks[0].input[0].value = options.password;
		params.callbacks[1].input[0].value = "1";
		params.callbacks[3].input[0].value = "true"; // Для установки куки persistent ("Запомнить")
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//		AnyBalance.trace('Отправка пароля: ' + JSON.stringify(json));
        
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
		
		if (json.header == "verify-password") {
	    	var retryCount = json.callbacks[2].output[0].value.lockoutCount;
	    	var invalidCount = json.callbacks[2].output[0].value.invalidCount;
	    	var restCount = retryCount - invalidCount;
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Неверный пароль! Осталось попыток: ' + restCount, allowRetry);
	    }
	}
	
	if (json.header == "verify-otp") {
		AnyBalance.trace('МТС запросил проверку с помощью кода из SMS');
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + recipient + '\n\nЕсли вы не хотите постоянно вводить SMS-пароли при входе, выберите способ входа "Пароль" в настройках безопасности вашего личного кабинета МТС', null, {inputType: 'number', time: 300000});
		
		var params = json;
		params.callbacks[0].input[0].value = code;
		params.callbacks[1].input[0].value = "1";
		params.callbacks[3].input[0].value = "true"; // Для установки куки persistent ("Запомнить")
		
		html = AnyBalance.requestPost(loginUrl, JSON.stringify(params), addHeaders(headers));
	
	    var json = getJson(html);
//    	AnyBalance.trace('Отправка кода из SMS: ' + JSON.stringify(json));
        
		if (json.header)
		    AnyBalance.trace('Progress header: ' + json.header);
		
		if (json.header == "verify-otp") {
	    	var retryCount = json.callbacks[2].output[0].value.retryCount;
	    	var invalidCount = json.callbacks[2].output[0].value.invalidCount;
	    	var restCount = retryCount - invalidCount;
	    	AnyBalance.trace(html);
            throw new AnyBalance.Error('Неверный код! Осталось попыток: ' + restCount, allowRetry);
	    }
	}
	
	if (json.tokenId && json.successUrl) {
		AnyBalance.trace('Успешно вошли через NUI: ' + JSON.stringify(json));
		var tokenId = json.tokenId;
		var successUrl = json.successUrl;
		
        // Дологиниваемся корректно с установкой куков сессии
		html = AnyBalance.requestGet(successUrl, addHeaders({Referer: loginRef}));
	} else {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?', allowRetry);
	}

    return html;
}

function clearAllCookiesExceptProtection(){
	clearAllCookies(function(c){return!/qrator|StickyID/i.test(c.name)&&!/^TS0/i.test(c.name)})
}