/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер ЭрТелеком 
Сайт оператора: http://citydom.ru/
*/

var g_region_change = {
	kzn: 'kazan',
	nch: 'chelny',
	nsk: 'novosib'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region || 'kzn'; // Казань по умолчанию
	
	if(g_region_change[domain])
		domain = g_region_change[domain];
	
	AnyBalance.trace('Selected region: ' + domain);
	var baseurl = 'https://lk.domru.ru/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var info = AnyBalance.requestGet(baseurl + "login");
	var token = getParam(info, null, null, /<input[^>]+value="([^"]*)"[^>]*name="YII_CSRF_TOKEN"/i);
	if (!token)
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
	AnyBalance.setCookie('domru.ru', 'citydomain'); //Удаляем старую куку
	AnyBalance.setCookie('.domru.ru', 'service', '0');
	AnyBalance.setCookie('.domru.ru', 'citydomain', domain, {path: '/'});
	
	// Заходим на главную страницу
	var info = AnyBalance.requestPost(baseurl + "login", {
		YII_CSRF_TOKEN: token,
		"Login[username]": prefs.log,
		"Login[password]": prefs.pwd,
		city: domain,
		yt0: 'Войти'
	});

 	if(!/\/logout/.test(info)) {
		var error = sumParam(info, null, null, /<div[^>]+class="b-login__errormessage"[^>]*>([\s\S]*?)<\/div>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(info, result, 'balance', /<span[^>]+balance-value[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'tariff_number', /№ договора:([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
	//getParam(info, result, 'name', /<span[^>]+class="client-name"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	sumParam(info, result, '__tariff', /<a[^>]*services__tarif[^>]*href[^>]*domru\.ru[^>]*>([\s\S]*?)<\//ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	getParam(info, result, 'bits', /<a[^>]+href="\/privilege"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(info, result, 'status', /<a[^>]+href="[^"]*status.domru.ru"[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
	
	getParam(info, result, 'pay_till', /(Не(?:&nbsp;|\s+)забудьте до[\s\S]*?)<\/p/i, replaceTagsAndSpaces, html_entity_decode);
	
	
	
/*	//Нет в новом кабинете
        if(AnyBalance.isAvailable('last_session_end','traffic_inner','traffic_outer','contract_type')){
	    AnyBalance.trace('Getting links to statistics by ' + baseurl + 'right.php?url=&entry=procedure%3Astatistic_user_pppoe.entry');
            info = AnyBalance.requestGet(baseurl + 'right.php?url=&entry=procedure%3Astatistic_user_pppoe.entry');

            var href = getParam(info, null, null, /<frame[^>]+target="right"[^>]*src="([^"]*)/i, null, html_entity_decode);
            if(!href){
                AnyBalance.trace('Не удаётся найти промежуточную ссылку на трафик.');
            }else{
                var session = getParam(href, null, null, /(client.*)/i);
                if(!session){
                    AnyBalance.trace('Не удаётся найти информацию о сессии.');
                }else{
		    AnyBalance.trace('Getting statistics');
		    info = AnyBalance.requestGet(baseurl + 'cgi-bin/ppo/es_webface/statistic_user_pppoe.statistic_user?' + session + '&day1$c=01&day2$c=-1');
                
                    getParam(info, result, 'traffic_inner', /Наработка за период по типу трафика "ДОМашний трафик"[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
                    getParam(info, result, 'traffic_outer', /Наработка за период по типу трафика "Интернет трафик"[^<]*?:([^<]*)/i, replaceTagsAndSpaces, parseTrafficGb);
                    getParam(info, result, 'last_session_end', /<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>Интернет трафик<\/td>\s*<td[^>]*>.*?<\/td>\s*<\/tr>\s*<tr[^>]+bgcolor="red"[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
                    getParam(info, result, 'contract_type', /Ваш договор:[\s\S]*?\(([\s\S]*?)\)\s*<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
                }
            }
	}
*/
	AnyBalance.setResult(result);
};