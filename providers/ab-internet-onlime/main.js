/**                                                 ferr
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
	Origin: 'https://my.rt.ru',
	Referer: 'https://my.rt.ru/',
	Connection: 'keep-alive',
	'content-type': 'application/json; charset=UTF-8',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'Cache-Control': 'max-age=0',
	'upgrade-insecure-requests': '1'
};

var g_headers1 = {
'accept':'application/json, text/plain, */*',
'content-type': 'application/json; charset=UTF-8',
'accept-encoding':'gzip, deflate, br',
'accept-language':'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
'content-type':'application/json;charset=UTF-8',
'dnt':'1',
'origin':'https://my.rt.ru',
'referer':'https://my.rt.ru/',
'sec-fetch-mode':'cors',
'sec-fetch-site':'same-origin',
'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36'

};

function getWtf(info){
	return getParam(info, null, null, /var wtf\s*=\s*'([^']+)/i);
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.rt.ru/';

	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Пожалуйста, введите номер лицевого счета или договора, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    var html = AnyBalance.requestGet(baseurl,g_headers);
    AnyBalance.trace(baseurl+'\n'+html);
if (!/Личный кабинет/.test(html)){
    var csrf = getParam(html, /_csrf_token":"([\s\S]*?)"/);
    AnyBalance.trace('csrf='+csrf);

//    AnyBalance.sleep(3000);
    var needCaptcha=AnyBalance.requestGet(baseurl+'api/lk/login/need-captcha', g_headers);
    AnyBalance.trace(needCaptcha);
    //html = AnyBalance.requestPost(baseurl + "session/getcaptchalogin/", '', addHeaders({'X-Requested-With': 'XMLHttpRequest', Referer: baseurl}));
    if (needCaptcha=='true') {
    	needCaptcha=AnyBalance.requestGet(baseurl+'api/lk/captcha/get-captcha');
    	AnyBalance.trace(needCaptcha);
	var img = getParam(needCaptcha, null, null, /response_captcha":"data\:image\/jpeg\;base64\,([\s\S]*?)"/i);
	AnyBalance.trace(img);
//	AnyBalance.trace('img='+img);
	var code= AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", img, {
		inputType: 'string',
		minLength: 5,
		maxLength: 5,
		time: 300000
	});

      needCaptcha=AnyBalance.requestPost(baseurl+'api/lk/captcha/check-captcha', {code:code}, g_headers);
    	AnyBalance.trace(needCaptcha);
      if (needCaptcha!='{"response_result":0}') throw new AnyBalance.Error('Введен неверный код с картинки');
      //{"response_result":1} нужно повторить - неверный код
      //{"response_result":0} Все ok. продолжаем    	
    }

    // Заходим на главную страницу
    AnyBalance.trace(    JSON.stringify({Authorization:{login:prefs.login, password:prefs.password, _csrf_token:csrf}}));
    var info = AnyBalance.requestPost(baseurl + "api/lk/login/auth", JSON.stringify({Authorization:{login:prefs.login, password:prefs.password, _csrf_token:csrf}}), g_headers1);
    	AnyBalance.trace(info);
    var json = JSON.parse(info);
    if (json.result!=0) throw new AnyBalance.Error('json.result!=0\n'+JSON.stringify(json._errors_validate));


//	var wtf = getWtf(info);
//	checkEmpty(wtf, 'Не удалось найти форму входа, сайт изменен?', true);
	
	if(!/Contracts/i.test(info)) {
		var error = 'Ошибка: нет Contracts\n'+getParam(info, null, null, /"message error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пароль неверный|не найден/i.test(error));
		
//		AnyBalance.trace(info);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
}    
	info = AnyBalance.requestPost(baseurl + 'json/cabinet/', {}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest', 'X-Request': 'JSON', 'X-Wtf': getWtf(info)}));
    	AnyBalance.trace(info);
    var result = {success: true};
	
	//info = AnyBalance.requestGet(baseurl + "json/cabinet/");
	
	var contracts = getParam(info, null, null, /<contracts>([\s\S]*?)<\/contracts>/i)
    if(contracts) {
        //Несколько контрактов на аккаунте. Надо выбрать нужный лицевой счет
        AnyBalance.trace('Требуется выбрать контракт...');
		
		var idx = getParam(contracts, null, null, new RegExp('row_id="(\\d+)">\\s*<ObjidPrvc>\\s*' + (prefs.num || ''), 'i'));
        if(!idx)
            throw new AnyBalance.Error(prefs.num ? 'Не удалось найти лицевой счет или договор с последними цифрами ' + prefs.num : 'Не удалось найти ни одного номера счета!');
        
        AnyBalance.trace('Выбираем контракт ' + idx + '...');
        info = AnyBalance.requestPost(baseurl + 'account/choose/', {contract: idx});
    	AnyBalance.trace(info);

		
		info = AnyBalance.requestPost(baseurl + 'json/cabinet/', {}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest', 'X-Request': 'JSON', 'X-Wtf': getWtf(info)}));
    }
    
    AnyBalance.trace('got info: ' + info);
    var oInfo = getJson(info.replace(/:(\-)?\./g, ':$10.')); //А то "balance":-.31 не распарсивается
	
	result.__tariff = oInfo.bonusAccount.tier;
	getParam(oInfo.accountInfo.balance, result, 'balance');
	getParam(oInfo.bonusAccount.points, result, 'bonus_balance');
	//Похоже, 1000 используется, как бесконечное значение, в кабинете показывается >100
	getParam(oInfo.accountInfo.daysToLock == 1000 ? 100 : oInfo.accountInfo.daysToLock, result, 'lock');
	getParam(oInfo.contract, result, 'agreement');
	getParam(oInfo.account, result, 'license');
    
	if((AnyBalance.isAvailable('balance') && !isset(result.balance)) || (AnyBalance.isAvailable('bonus_balance') && !isset(result.bonus_balance)) || (AnyBalance.isAvailable('lock') && !isset(result.lock))) {
        //Странно, json не вернул то, что надо, придется из html вырезать
        var html = AnyBalance.requestGet(baseurl + 'billing/balance');
		
        getParam(html, result, 'balance', /Баланс:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'lock', /Количество дней до блокировки:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    }
	
    if((AnyBalance.isAvailable('bonus_balance') && !isset(result.bonus_balance))) {
        //Странно, json не вернул то, что надо, придется из html вырезать
        var html = AnyBalance.requestGet(baseurl + 'bonus/account/');
    	AnyBalance.trace(html);

        getParam(html, result, 'bonus_balance', /Бонусный счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    if(AnyBalance.isAvailable('abon')){
		html = AnyBalance.requestGet(baseurl + "services/", g_headers);
    	AnyBalance.trace(html);
		var wtf = getParam(html, /wtf\s*=\s*'([^']*)/);

		html = AnyBalance.requestGet(baseurl + "json/getcontract/", addHeaders({
			'X-Requested-With': 'XMLHttpRequest',
			Referer: baseurl + 'services/',
			Accept: 'application/json',
			'X-Request': 'JSON',
			'X-Wtf': wtf
		}));
                     	AnyBalance.trace(html);
		json = getJson(html);
		var services = ['internet', 'inetdvbc'];
		for(var i=0; i<services.length; ++i){
			var service = json.configuration[services[i]];
			if(service && service.status == 'ON' && service.rateplan){
				AnyBalance.trace(services[i] + ' включен, узнаем абонентскую плату');
				for(var svc in json.catalogue.rateplans){
					var rps = json.catalogue.rateplans[svc];
					var found = rps.filter(function(r){ return r.code == service.rateplan.code })[0];
					if(found){
						sumParam(found.price, result, 'abon', null, null, null, aggregate_sum);
						break;
					}
				}
			}
		}
    	
    }                   
    
    AnyBalance.setResult(result);
}