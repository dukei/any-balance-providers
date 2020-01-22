/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36'
};

var baseurl = 'https://money.yandex.ru/';

function loginAndGetBalance(prefs, result) {
	checkEmpty(prefs.login, 'Введите логин в Яндекс.Деньги!');
	checkEmpty(prefs.password, 'Введите пароль, используемый для входа в систему Яндекс.Деньги. Не платежный пароль, а именно пароль для входа!');
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	var html = AnyBalance.requestGet("https://passport.yandex.ru", g_headers);
	
	html = loginYandex(prefs.login, prefs.password, html, baseurl + 'index.xml', 'money');
	
	if (!/logout-url/i.test(html))
		throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");

	var ld = getJsonObject(html, /window.__layoutData__\s*=/);
	if(ld){
		AnyBalance.trace('Загружаем из layoutData');
		getParam(ld.user.accountId, result, 'number');
		getParam(ld.balance.rub.availableAmount, result, 'balance');
		var sk = ld.secretKey;

		if(ld.balance.bonus){
			getParam(ld.balance.bonus.availableAmount, result, 'bonus');
		}else{
			var html = AnyBalance.requestGet(baseurl + 'ajax/layout/accounts?sk=' + encodeURIComponent(sk), addHeaders({
				Accept: 'application/json, text/plain, */*',
				Referer: baseurl
			}));
			var json = getJson(html);
			getParam(json.balances.bonus.availableAmount, result, 'bonus');
		}
	}else{
		AnyBalance.trace('Загружаем по-старинке');
		getParam(html, result, 'number', /Номер кошелька(?:[^>]*>){2}(\d{10,20})/i, replaceTagsAndSpaces);
		
		var textsum = getElements(html, [/<button/ig, /balance__icon/i])[0];
		if(textsum)
			textsum = replaceAll(textsum, replaceTagsAndSpaces);
    
		AnyBalance.trace('Предположительно баланс где-то здесь: ' + textsum);
    
		if(!textsum || /\*{3}/.test(textsum)) {
		    AnyBalance.trace('Сумма спрятана. Будем пытаться найти...');
			//var text = AnyBalance.requestGet(baseurl + "tunes.xml", g_headers);
			//Теперь ключ и баланс в такой структурке: 
			//<div class="balance i-bem" data-bem="{&quot;balance&quot;:{&quot;amount&quot;:{&quot;sum&quot;:112.88,&quot;code&quot;:&quot;643&quot;},&quot;isHidden&quot;:true,&quot;setSumFlagUrl&quot;:&quot;/ajax/sum-visibility?sk=u8c9727f96af623dcb0814a3da5451cd6&quot;}}">
		    var params = getParam(html, null, null, /<div[^>]+class="[^>]*\bbalance\b[^>]+data-bem=[']([^']*)/i, replaceHtmlEntities, getJson);
		    AnyBalance.trace('Получаем баланс из ' + JSON.stringify(params));
		    if(params && params.balance && params.balance.amount && isset(params.balance.amount.sum)){
		    	getParam(params.balance.amount.sum, result, 'balance');
		    }else{
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удаётся найти спрятанный баланс! Сайт изменен?');
			}
		} else {
		    getParam(textsum, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		}
    
		getParam(html, result, 'bonus', /Сколько у вас баллов[\s\S]*?<div[^>]+balance__item[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
}

function processHistory(result) {
	if(!AnyBalance.isAvailable('transactions'))
		return;
	
	var maxCount = 100;
	var startCount = 0;

	result.transactions = [];
	
	for(var z=1; z<=10; z++) {
		var html = AnyBalance.requestGet(baseurl + 'ajax/history/partly?ncrnd=72010&history_shortcut=history_all&start-record=' + startCount + '&record-count=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
		startCount +=maxCount;
		var json = getJson(html);		
		
		AnyBalance.trace('Найдено транзакций: ' + json.history.length);
		for(var i=0; i < json.history.length; ++i) {
			var h = {};
			
			getParam((json.history[i].type == 2 ? '-' : '') + json.history[i].sum + '', h, 'transactions.sum', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.history[i].name, h, 'transactions.name', null, replaceTagsAndSpaces);
			getParam(json.history[i].date, h, 'transactions.time', null, replaceTagsAndSpaces, parseDateISO);
			
			result.transactions.push(h);
		}
		if(!json.hasMore) {
			AnyBalance.trace('Транзакций больше нет...');	
			break;
		}
	}
}

function getCombinedHistory(){
	var maxCount = 100;
	var htmlBalls = AnyBalance.requestGet(baseurl + 'ajax/load-bonus-history?recordCount=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	var htmlTrns = AnyBalance.requestGet(baseurl + 'ajax/history/partly?ncrnd=72010&history_shortcut=history_all&start-record=0&record-count=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	var jsonBalls = getJson(htmlBalls);		
	var jsonTrns = getJson(htmlTrns);

	combineHistory(jsonTrns, jsonBalls);
    return jsonTrns.history;
}

function combineHistory(jsonTrns, jsonBalls){
    for(var i=0, j=0; i<jsonBalls.items.length; ++i){
    	var balls = jsonBalls.items[i];
    	
    	var timeBa = parseDateISOSilent(balls.date);
    	var typeBa;
    	if(/за пятый|в категории месяца/i.test(balls.name))
    		typeBa = 'card';
    	else if(/за плат[её]ж в интернете/i.test(balls.name))
    		typeBa = 'internet';
    	else if(balls.isIncoming === false)
    		typeBa = 'balls';
    	else{
    		AnyBalance.trace('Тип начисления баллов неизвестен: ' + balls.name + '\n' + JSON.stringify(balls));
    		typeBa = 'unknown';
    	}

    	if(typeBa === 'balls') //Списание баллов
    		continue;

    	//Домотаем до первой транзакции произошедшей НЕ ПОЗДНЕЕ начисления баллов
    	for(;j<jsonTrns.history.length && parseDateISOSilent(jsonTrns.history[j].date) > timeBa; ++j);
    	if(j >= jsonTrns.history.length)
    		break;

    	for(var j1=j; j1<jsonTrns.history.length; ++j1){
        	var trns = jsonTrns.history[j];
    		var timeTr = parseDateISOSilent(trns.date);
    		if(timeBa - timeTr > 5*60*1000) //Слишком удалились по времени от начисления баллов
    			break;
    		if(typeBa === 'card' && !trns.flags['is-meta-ycard-operation'])
    			continue; //Нужна карточная операция, а это не карточная
    		if(typeBa === 'internet' && !trns.flags['is-out-shop'])
    		    continue; //Нужна оплата интернет-магазину, а это не она
        	
        	trns.__balls = balls;
        	j = j1 + 1;
        	
        	break;
        }

        if(!trns.__balls){
        	AnyBalance.trace('Не удалось найти транзакцию для баллов ' + JSON.stringify(balls));
        }
    }

    AnyBalance.trace(i + '/' + jsonBalls.items.length + ' баллов поставлены в соответствие транзакциям');
}