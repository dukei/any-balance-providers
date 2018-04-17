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
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	newTypicalLanBillingInetTv('http://lk.regiontelekom.ru/');
}

function newTypicalLanBillingInetTv(baseurl) {
	var urlAjax = baseurl + '?r=account/vgroups&agrmid=';
	var urlIndex = baseurl + '?r=site/login';

	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	if(prefs.__dbg) {
		var html = AnyBalance.requestGet(baseurl + '?r=account/index');
	} else {
		var html = AnyBalance.requestGet(urlIndex);

		html = AnyBalance.requestPost(urlIndex, {
			'LoginForm[login]':prefs.login,
			'LoginForm[password]':prefs.password,
			'yt0':'Войти'
		});
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="alert alert-block alert-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};
	var priority = {active: 0, inactive: 1};

	//Вначале попытаемся найти интернет лиц. счет
	var accTv = [], accInet = [], accPeriod = [];

	var accs = sumParam(html, null, null, /<tr[^>]*agreements[^>]*row(?:[^>]*>){10,20}\s*<\/tr>/ig);
	AnyBalance.trace('Найдено счетов: ' + accs.length);

	getParam(html, result, 'fio', /<span[^>]+class="content-aside-name">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
	for(var i=0; i < accs.length; ++i) {
		var account = getParam(accs[i], null, null, [/<strong>\s*(\d+)/i, /<td[^>]+class="first_col"[^>]*>([\s\S]*?)<\/td>/i]);
		var accountID = getParam(accs[i], null, null, /<tr[^>]*agreements[^>]*row[^>]*?(\d+)/i);
		var balance = getParam(accs[i], null, null, /(-?[\s\d.,]+руб)/i, null, parseBalance);

		if(!isset(account) || !isset(accountID)) {
			AnyBalance.trace('Не удалось найти данные, проблемы на сайте?');
			continue;
		}

		var xhtml = AnyBalance.requestGet(urlAjax + accountID);
		var json = getJson(xhtml);

		// Может быть несколько услуг по одному счету
		AnyBalance.trace('Услуг по счету ' + account + ': ' + json.body.length);

		for(var j = 0; j < json.body.length; j++) {
			var tarifdescr = json.body[j].tarifdescr;
			if(typeof tarifdescr == 'object') {
				tarifdescr = tarifdescr.descr;  //Интернет
			}

			var state = json.body[j].state.state + ''; //Состояние: активен, Недостаточно средств, Выключен, Действует
			var services = json.body[j].services[0] + ''; //Нет подключенных услуг

			var response = {
				balance:balance,
				сost:json.body[j].rent,
				acc:account,
				accId:accountID,
				'tarifdescr':tarifdescr,
				'state':state,
				'services':services
			};
			var act = /Состояние:\s+актив|Действует/i.test(state) ? 'active' : 'inactive';
			var pri = priority[act];

			if(/Услуги цифрового телевидения/.test(tarifdescr)) {
				if(!isset(accTv[pri]))
					accTv[pri] = response;
			} else if(/Периодические и разовые услуги/.test(tarifdescr)){
				if(!isset(accPeriod[pri]))
					accPeriod[pri] = response;
			} else if(!isset(accInet[pri])) // Это интернет
					accInet[pri] = response;
		}

	}

	var usedAccs = {};//аккаунты только уникальные собираем

	function readAcc(json){
		if(json) {
			getParam(json.balance, result, 'balance');
			if(!usedAccs['acc_' + json.acc]){ //аккаунты только уникальные собираем
				sumParam(json.acc, result, 'agreementID', null, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
				usedAccs['acc_' + json.acc] = true;
			}

			if(!/Выключен/i.test(json.state) && !/не\s*доступно/i.test(json.services)) {
				sumParam(json.сost, result, 'сost', null, null, parseBalance, aggregate_sum);
				sumParam(json.tarifdescr, result, '__tariff', null, null, null, aggregate_join);
				if(!/Нет подключенных услуг/.test((json.services)))
					sumParam(json.services, result, 'services', null, null, null, aggregate_join);
			}
		}
	}

	function readAccByPriority(arr) {
		for(var i = 0; i<arr.length; ++i)
			if(arr[i])
				return readAcc(arr[i]);
	}

	readAccByPriority(accInet);
	readAccByPriority(accTv);
	readAccByPriority(accPeriod);

	getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
}