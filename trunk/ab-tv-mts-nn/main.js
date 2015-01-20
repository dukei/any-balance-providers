/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var urlIndex = 'https://lktvnn.pv.mts.ru/index.php?r=site/login';
	var urlAjax = 'https://lktvnn.pv.mts.ru/index.php?r=account/vgroups&agrmid=';
	
	newTypicalLanBillingInetTv(urlIndex, urlAjax);
}

function newTypicalLanBillingInetTv(urlIndex, urlAjax) {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	if(prefs.__dbg) {
		var html = AnyBalance.requestGet('https://lk.kirovnet.net/?r=account/index');
	} else {
		var html = AnyBalance.requestGet(urlIndex);
		
		html = AnyBalance.requestPost(urlIndex, {
			'LoginForm[login]':prefs.login,
			'LoginForm[password]':prefs.password,
			'yt0':'Войти'
		});
	}
	
	if (!/r=site\/logout/i.test(html)) {
		var error = getParam(html, null, null, /Необходимо исправить следующие ошибки:([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
    var priority = {active: 0, inactive: 1};
	
    //Вначале попытаемся найти интернет лиц. счет
    var accTv = [], accInet = [];
	
	var table = getParam(html, null, null, /Номер договора[\s\S]*?<\/table>/i);
    var accs = sumParam(html, null, null, /<tr[^>]*agreements[^>]*row(?:[^>]*>){10,20}\s*<\/tr>/ig);
	AnyBalance.trace('Найдено счетов: ' + accs.length);
	
    for(var i=0; i < accs.length; ++i) {
		var account = getParam(accs[i], null, null, /<strong>\s*(\d+)/i);
		var accountID = getParam(accs[i], null, null, /<tr[^>]*agreements[^>]*row[^>]*?(\d+)/i);
		var balance = getParam(accs[i], null, null, /(-?[\s\d.,]+руб)/i, null, parseBalance);
		
		var xhtml = AnyBalance.requestGet(urlAjax + accountID);
		
		var json = getJson(xhtml);
		
		// Может быть несколько услуг по одному счету
		AnyBalance.trace('Услуг по счету ' + account + ': ' + json.body.length);
		
		for(var j = 0; j < json.body.length; j++) {
			var tarifdescr = json.body[j].tarifdescr + ''; //Цифровое ТВ
			var state = json.body[j].state.state + ''; //Состояние: активен
			var services = json.body[j].services[0] + ''; //Нет подключенных услуг
			
			var response = {
				bal:balance,
				acc:account,
				accId:accountID,
				'tarifdescr':tarifdescr,
				'state':state,
				'services':services
			};
			var act = /Состояние:\s+актив/i.test(state) ? 'active' : 'inactive';
			var pri = priority[act];
			// Это ТВ
			if(/\BТВ\B/.test(tarifdescr)) {
				if(!isset(accTv[pri]))
					accTv[pri] = response;
			// Это интернет
			} else {
				if(!isset(accInet[pri]))
					accInet[pri] = response;				
			}
		}
    }
	
    var usedAccs = {};//аккаунты только уникальные собираем

    function readAcc(json, isInet){
        if(json) {
			getParam(json.bal, result, isInet ? 'balance' : 'balance_tv');
			if(!usedAccs['acc_' + json.acc]){ //аккаунты только уникальные собираем
				sumParam(json.acc, result, 'agreement', null, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
				usedAccs['acc_' + json.acc] = true;
			}
			
			if(!/Нет подключенных услуг/i.test(json.services)) {
				sumParam(json.tarifdescr, result, '__tariff', null, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
			}
		}
    }
	
    function readAccByPriority(arr, isInet) {
        for(var i = 0; i<arr.length; ++i)
            if(arr[i])
                return readAcc(arr[i], isInet);
    }
	
    readAccByPriority(accInet, true);
    readAccByPriority(accTv);
	
    getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
	
    AnyBalance.setResult(result);
} 
