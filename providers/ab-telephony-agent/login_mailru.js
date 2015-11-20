function loginMailRu(baseurl){
    var prefs = AnyBalance.getPreferences();

    var parts = prefs.login.match(/([\w-\.]+)@((?:[\w]+\.)+[a-zA-Z]{2,4})$/i);
    if(!parts)
         throw new AnyBalance.Error('Вы ввели неправильный е-мейл для входа на mail.ru.', null, true);
	
	var baseurlLogin = "https://auth.mail.ru/cgi-bin/auth";
	
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost(baseurlLogin + '?lang=ru_RU&from=authpopup', {
        page:baseurl,
        FailPage:'',
        Login:prefs.login,
        Domain:parts[2].toLowerCase(),
        Password:prefs.password,
        new_auth_form:1
    });
	
	if(AnyBalance.getLastUrl().indexOf(baseurl) != 0){
		var error = getParam(html, null, null, /<div[^>]+login-page__external_error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }

    return html;
}

