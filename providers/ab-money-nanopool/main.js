var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.wallet, 'Введите номер кошелька!');


	if (prefs.pool=='eth') {
		var baseurl = 'https://eth.nanopool.org/api/v1/balance_hashrate/';
		var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
		}
		var json = getJson(html);
		if(json.status !== true)
			throw new AnyBalance.Error(json.error);
	 
		var result = {success: true};
		getParam(json.data.balance, result, 'balanceETH');
		getParam(json.data.hashrate, result, 'hashrateETH');
	}
	else if (prefs.pool=='etc') {
		var baseurl = 'https://etc.nanopool.org/api/v1/balance_hashrate/';
		var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
		}
		var json = getJson(html);
		if(json.status !== true)
			throw new AnyBalance.Error(json.error);

			
		var result = {success: true};
		getParam(json.data.balance, result, 'balanceETC');
		getParam(json.data.hashrate, result, 'hashrateETC');
	}
	else if (prefs.pool=='sia') {
		var baseurl = 'https://sia.nanopool.org/api/v1/balance_hashrate/';
		var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
		}
		var json = getJson(html);
		if(json.status !== true)
			throw new AnyBalance.Error(json.error);

			
		var result = {success: true};
		getParam(json.data.balance, result, 'balanceSIA');
		getParam(json.data.hashrate, result, 'hashrateSIA');
	}
	else if (prefs.pool=='zec') {
		var baseurl = 'https://zec.nanopool.org/api/v1/balance_hashrate/';
		var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
		}
		var json = getJson(html);
		if(json.status !== true)
			throw new AnyBalance.Error(json.error);

			
		var result = {success: true};
		getParam(json.data.balance, result, 'balanceZEC');
		getParam(json.data.hashrate, result, 'hashrateZEC');
	}
	else if (prefs.pool=='xmr') {
		var baseurl = 'https://xmr.nanopool.org/api/v1/balance_hashrate/';
		var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
		}
		var json = getJson(html);
		if(json.status !== true)
			throw new AnyBalance.Error(json.error);

			
		var result = {success: true};
		getParam(json.data.balance, result, 'balanceXMR');
		getParam(json.data.hashrate, result, 'hashrateXMR');
	}
	else if (prefs.pool=='pasc') {
		var baseurl = 'https://pasc.nanopool.org/api/v1/balance_hashrate/';
		var html = AnyBalance.requestGet(baseurl + prefs.wallet, g_headers);
		if (!html || AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
		}
		var json = getJson(html);
		if(json.status !== true)
			throw new AnyBalance.Error(json.error);

			
		var result = {success: true};
		getParam(json.data.balance, result, 'balancePASC');
		getParam(json.data.hashrate, result, 'hashratePASC');
	}
	else {
		throw new AnyBalance.Error('Выберите пул монеты');
		
	}
	

AnyBalance.setResult(result);
	
}