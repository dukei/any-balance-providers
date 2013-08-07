/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Бонусная программа Carbon (ТНК)

Сайт программы: http://carbon-card.ru/
Личный кабинет: https://pay.carbon-card.ru/personal/pub/Login
*/

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)(?:&thinsp;)/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /руб[\s\S]*?(-?\d[\d\.,]*)/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function main() {
	var result = {success: true};
    var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost('https://pay.carbon-card.ru/personal/pub/Login?wicket:interface=:1:frmLogin::IFormSubmitListener::', {
        'login':prefs.login,
        'password':prefs.password
    });

    if(!/Выйти/i.test(html)){
        var error = getParam(html, null, null, /inputBadPwdOrCard" class="error">([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /"balance-value"[\s\S]*?">([\s\S]*?availableBalanceKopecks[\s\S]*?коп)/i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'active', /"bonuspoints">[\s\S]*?<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deferred', /deferred[\s\S]*?<span class="bonuspoints">([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
	
	
	
	
	/*var regexp;
	if(html.indexOf('<a href="#" class="exit"')!=-1) {
		//Целая часть баланса
		regexp = new RegExp('<span class="balance-value" testid="availableBalance" id="[^"]+">([0-9 ]+)</span>');
		matches=regexp.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения первой части баланса.");
		result.balance=parseFloat(matches[1].replace(" ",""));

		//Дробная часть баланса
		regexp=new RegExp('<span class="saldo-cents" testid="availableBalanceKopecks" id="[^"]+">(\\d+)</span>');
		matches=regexp.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения второй части баланса.");
		result.balance=result.balance+parseFloat(matches[1])/Math.pow(10,matches[1].length);
	
		//Активные бонусы
		regexp=new RegExp('<div class="active">[\\s\\S]+?<span class="bonuspoints">([0-9. ]+)</span>');
		matches=regexp.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения количества активных бонусов.");
		result.active=parseFloat(matches[1].replace(" ",""));

		//Отложенные бонусы
		regexp=new RegExp('<div class="deferred">[\\s\\S]+?<span class="bonuspoints">([0-9. ]+)</span>');
		matches=regexp.exec(html);
		if(matches==null) throw new AnyBalance.Error("Ошибка получения количества отложенных бонусов.");
		result.deferred=parseFloat(matches[1].replace(" ",""));
		
	} else {
		regexp=new RegExp('<div testid="inputBadPwdOrCard" class="error">([\\s\\S]+?)</div>');
		matches=regexp.exec(html);
		if(matches!=null) {
			matches[1]=matches[1].replace(/<[^>]+>/g,"");
			matches[1]=matches[1].replace(/\\s+/g," ");
			matches[1]=matches[1].replace(/(^\s+)|(\s+$)/g,"");
			if(matches[1].length>0) throw new AnyBalance.Error(matches[1]);
		}
		throw new AnyBalance.Error("Авторизация не удалась. Попробуйте повторить попытку позднее.");
	}

    AnyBalance.setResult(result);*/
}

