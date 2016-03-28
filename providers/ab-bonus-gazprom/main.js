/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Газпромнефть - Нам по пути.

Сайт программы: http://www.gpnbonus.ru
*/

function img2status(str){
    var statuses = {
        silver: 'Серебряный',
        gold: 'Золотой',
        platinum: 'Платиновый'
    };

    return statuses[str] || str;
}

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl='https://www.gpnbonus.ru/';
	AnyBalance.trace('Sending a request for authorization');
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'login/', g_headers);
	
	var form = getParam(html, null, null, /<form[^>]+id="login_form"[^>]*>([\s\S]*?)<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Не найдена форма входа. Сайт изменен?');
	
	var params = createFormParams(form);
	
	if(params.captcha_code){
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl + 'bitrix/tools/captcha.php?captcha_code=' + params.captcha_code);
			params.captcha_word = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + params.captcha_word);
		}else{
			throw new AnyBalance.Error('К сожалению, сайт http://www.gpnbonus.ru ввел капчу (ввод циферок с картинки) для входа в личный кабинет. Пожалуйста, обратитесь в справочную службу ГазПромНефть по телефону 8 800 700 5151 и попросите отменить капчу или сделать интерфейс для автоматических программ.');
        }
	}
	AnyBalance.trace('Отправляем данные: ' + JSON.stringify(params));
	params.login = prefs.login;
	params.password = prefs.password;
	
	var html = AnyBalance.requestPost(baseurl + 'oneLogin/ru/', params, g_headers);
	var json = getJson(html);
	if(json.action != 'login_ok'){
		if(json.mess)
			throw new AnyBalance.Error(json.mess, null, /неверный номер карты/i.test(json.mess));
	    AnyBalance.trace(html);
		throw new AnyBalance.Error ('Не удаётся зайти в личный кабинет. Возможно, неправильный логин, пароль или сайт изменен.');
	}

	AnyBalance.trace('Authorization was successful');

	html = AnyBalance.requestGet(baseurl + 'profile-online/main/', g_headers);

	if(/twopass/i.test(html)){
		throw new AnyBalance.Error('Газпромбонус просит сменить пароль. Пожалуйста, зайдите в личный кабинет через браузер и смените пароль.', null, true);
	}

	AnyBalance.trace('Start parsing...');
	
	var result = {success: true};
	
        
	var reStatus = /Текущий статус карты[\s\S]{1,100}?<img[^>]+src="[^"]*images\/([^\/"]*)\.png"[^>]*>/i;
	var reSave = /Для подтверждения статуса[\s\S]{1,50}?необходимо совершить покупки на сумму[\s\S]{1,100}?<div[^>]*>([^]+?)<\/div\s*>/i;
	var reHeighten = /Для повышения статуса[\s\S]{1,50}?необходимо совершить покупки на сумму[\s\S]{1,100}?<div[^>]*>([^]+?)<\/div\s*>/i;

	getParam(html, result, 'balance', /Бонусов доступно[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', reStatus, replaceTagsAndSpaces, img2status);
	getParam(html, result, '__tariff', reStatus, replaceTagsAndSpaces, img2status);
	getParam(html, result, 'month_need', reSave, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'customer', /<div[^>]+class="[^"]*PersonalName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'month_need_up', reHeighten, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('month')){
		var currDate = new Date();
            
		html = AnyBalance.requestPost(baseurl + 'profile-online/statistics/handler.php', {
			year: currDate.getFullYear(),
			month: currDate.getMonth() + 1
			}, g_headers);
                
		var monthSum = 0;
		var jsonStat = AB.getJson(html)
		if(!jsonStat) {
			AnyBalance.trace("В текущем месяце покупок не найдено.");
		} else {
			for (var i = 0; i < jsonStat.length; ++i) {
				monthSum += parseFloat(jsonStat[i].sum);
			}
			getParam(Math.round(monthSum * 100) / 100, result, 'month');
		}

	}
	
	AnyBalance.trace('End parsing...');
	AnyBalance.setResult(result);
}