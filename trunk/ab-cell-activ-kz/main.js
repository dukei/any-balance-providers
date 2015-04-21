/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
};

function main(){
    var langMap = {
        rus: 'ru',
        kaz: 'kk'
    };
	
    var prefs = AnyBalance.getPreferences();
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона');
    checkEmpty(prefs.password, 'Введите пароль');
	
    var baseurl = "https://www.activ.kz/";
	
    AnyBalance.setDefaultCharset('utf-8');
	
    AnyBalance.trace("Trying to enter ics at address: " + baseurl);
    var lang = prefs.lang || 'ru';
    lang = langMap[lang] || lang; //Переведем старые настройки в новые.
	
    var html;
    if(!prefs.__dbg) {
        html = AnyBalance.requestPost(baseurl + lang + "/ics.security/authenticate", {
            'msisdn': '+7 (' + prefs.login.substr(0, 3) + ') ' + prefs.login.substr(3, 3) + '-' + prefs.login.substr(6, 4),
            'password': prefs.password
        }, addHeaders({'Referer': baseurl + lang + '/ics.security/login'}));
		
		//AnyBalance.trace(html);
        
        if(!/security\/logout/i.test(html)){
			var error = getParam(html, null, null, /<div[^>]*class="[^"]*alert[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			
			throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Если вы уверены, что правильно ввели логин-пароль, то это может быть из-за проблем на сервере или изменения личного кабинета.");
        }
		
		if(/icons\/503\.png/i.test(html))
			throw new AnyBalance.Error("Проблемы на сервере, сайт изменен или, возможно, вы ввели неправильный номер телефона.");
		
		if(/<title>\s*Смена пароля\s*<\/title>/i.test(html))
			throw new AnyBalance.Error("Необходимо сменить пароль, зайдите на сайт через браузер и смените пароль.");
    } else {
		html = AnyBalance.requestGet(baseurl + lang + '/ics.account/dashboard', {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'});
    }
    
    var result = {success: true};
    //(?:Теңгерім|Баланс|Balance):
    getParam(html, result, 'balance', /<h5[^>]*>(?:Ваш баланс|Сіздің теңгеріміңіз|Your balance is)([\s\d,.-]+)/i, replaceTagsAndSpaces, parseBalance);
    //(?:интернет плюс|internet plus)
    getParam(html, result, 'internet_plus', /(?:Ваш баланс|Сіздің теңгеріміңіз|Your balance is)[^<]*?\+\s*([\d\s.,]*\s*[Mм][Bб])/i, replaceTagsAndSpaces, parseTraffic);
    //(?:бонусные единицы)
    getParam(html, result, 'bonus', /(\d+)\s*(?:бонусных единиц|бонустық бірлік|bonus units)/i, replaceTagsAndSpaces, parseBalance);
    //(?:Шот қалпы|Статус номера|Account status):
    getParam(html, result, 'status', /<h5>(?:Статус|Қалпы|Status)(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    //(?:Шот қалпы|Статус номера|Account status):
    getParam(html, result, 'min_roaming', /([\d\.]+)\s*(?:Бонусных минут в роуминге|Роумингтегі бонус минут|Bonus minutes in roaming)/i, replaceTagsAndSpaces, parseBalance);
    //Тариф:
    getParam(html, result, '__tariff', /(?:Тарифный план|Тариф|Tariff):(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}