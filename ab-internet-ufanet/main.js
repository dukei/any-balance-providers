/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для уфимского интернет-провайдера Ufanet

Сайт оператора: http://ufanet.ru/
Личный кабинет: https://my.ufanet.ru/

Отлаживается отладчиком параметры:
__dbg:true, - без этого будет падать
__dbgCab:'old' - определяем кабинет
*/

function encodeURIComponent1251 (str) {
	var transAnsiAjaxSys = [];
	for (var i = 0x410; i <= 0x44F; i++)
		transAnsiAjaxSys[i] = i - 0x350; // А-Яа-я
		
	transAnsiAjaxSys[0x401] = 0xA8;    // Ё
	transAnsiAjaxSys[0x451] = 0xB8;    // ё

	var ret = [];
	// Составляем массив кодов символов, попутно переводим кириллицу
	for (var i = 0; i < str.length; i++) {
		var n = str.charCodeAt(i);
		if (typeof transAnsiAjaxSys[n] != 'undefined')
			n = transAnsiAjaxSys[n];
		if (n <= 0xFF)
			ret.push(n);
	}
	return escape(String.fromCharCode.apply(null, ret));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    if(prefs.licschet && !/^\d{5,}$/.test(prefs.licschet))
        throw new AnyBalance.Error('Укажите цифры номера лицевого счета, по которому вы хотите получить информацию, или не указывайте ничего, чтобы получить информацию по первому лицевому счету.');

    var baseurl = 'https://my.ufanet.ru/';
	var html = '';
	
	if(!prefs.__dbg) {
		html = AnyBalance.requestPost(baseurl + 'login', {
			city: (prefs.city ? prefs.city : 'ufa'),
			contract:encodeURIComponent1251(prefs.login),
			password:prefs.password
		});
	} else {
		if(prefs.__dbgCab == 'old')
			html = AnyBalance.requestGet('http://stat1.ufanet.ru/bgbilling/webexecuter');
		else
			html = AnyBalance.requestGet(baseurl);
	}
	var result = {success: true};
	
	if(AnyBalance.getLastUrl().indexOf('stat1.ufanet.ru') > 0) {
		AnyBalance.setDefaultCharset('windows-1251');
		AnyBalance.trace('Попали в старый кабинет, обратите внимание, в старом кабинете игнорируется настройка № договора, для исправления свяжитесь с автором по e-mail');
		AnyBalance.trace(html);
		if(!/action=Exit/i.test(html)){
			var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
		}
		// http://stat1.ufanet.ru/bgbilling/webexecuter?action=ShowBalance&mid=contract&contractId=488711
		html = AnyBalance.requestGet('http://stat1.ufanet.ru/bgbilling/webexecuter' + getParam(html, null, null, /href="([^"]*)[^>]*>Просмотр баланса/));
		
		getParam(html, result, 'balance', /Исходящий остаток на конец месяца(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'agreement', /Договор №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	} else {
		AnyBalance.trace('Попали в новый кабинет');
		if(!/\/logout/i.test(html)){
			var error = getParam(html, null, null, /<div[^>]*class=["']error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
		}
		if(prefs.licschet){
			var ls = getParam(html, null, null, /Лицевой счет<\/p>\s*<p[^>]+class="important"[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
			if(!ls || ls.indexOf(prefs.licschet) < 0){
				var re = new RegExp('<a[^>]+href="/(contract/change-contract/[^"]*)"[^>]*>(?:[\\s\\S](?!</a>))*?' + prefs.login, 'i');
				var href = getParam(html, null, null, re, null, html_entity_decode);
				AnyBalance.trace("Переходим в другой лиц. счет: " + href);
				html = AnyBalance.requestGet('https://my.ufanet.ru/' + href);
			}
		}
		getParam(html, result, 'balance', /Остаток на счете:[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'pay', /Рекомендуемая сумма к оплате:[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'daysleft', /До конца учетного периода:[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'licschet', /Лицевой счет<\/p>\s*<p[^>]+class="important"[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'agreement', /№ договора[\S\s]*?<p[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

		html = AnyBalance.requestGet(baseurl + "contract/information");

		getParam(html, result, '__tariff', /Тарифный план([\S\s]*?)(?:сменить|<\/p>|\(<a)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'abon', /Абонентская плата([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
	}

    AnyBalance.setResult(result);
}