var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.coin, 'Выберите coin!');
	
	validateWallet(prefs.wallet);
	if (prefs.coin != 'api.ethermine.org'){
		var currency = 'ETC';
	}
	else{
		var currency = 'ETH';
	}

	var baseurl = 'https://' + prefs.coin + '/';
	AnyBalance.trace('Иду на: ' + baseurl);
	var html = AnyBalance.requestGet(baseurl + 'miner/' + prefs.wallet + '/workers', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился.');
	}
	
	var json = getJson(html);
		if (json.status != 'OK') {
		var error = json.error;
		if (error)
			throw new AnyBalance.Error(error, null, /Invalid address/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти данный адрес кошелька');
	}
	
	var fw = json.data.find(function(el){
		return el.worker === prefs.worker;
	});
	
	var hr = fw ? fw['currentHashrate'] : null;
	if (hr == undefined || hr == null){
			AnyBalance.trace('Не могу найти воркера: ' + prefs.worker + ' - хешрейта для воркера не будет');
	}
	var rhr = fw ? fw['reportedHashrate'] : null;
	html = AnyBalance.requestGet(baseurl + 'miner/' + prefs.wallet + '/currentStats', g_headers);
	AnyBalance.trace(html);
	var json = getJson(html);
	if (json.data !=null && json.data !== 'NO DATA'){
		var aw = json.data.activeWorkers;	
		var up = json.data.unpaid;
		var uc = json.data.unconfirmed;
		var hrg = json.data.currentHashrate;
		var rhrg = json.data.reportedHashrate;
	}
	else 
		throw new AnyBalance.Error('Не удалось найти данные, проверьте wallet address');

	var result = { success: true };
	getParam(hrg, result, 'hashrateGeneral', null, null, parseBalance2);
	getParam(hr, result, 'hashrateWorker', null, null, parseBalance2);
	getParam(rhrg, result, 'rephashrateGeneral', null, null, parseBalance2);
	getParam(rhr, result, 'rephashrateWorker', null, null, parseBalance2);
	getParam(aw, result, 'activeworker');
	getParam(up, result, 'up', null, null, parseUP);
	getParam(currency, result, 'currency');
	getParam(prefs.worker, result, '__tariff');
    AnyBalance.setResult(result);
}
function parseBalance2(str) {
  var val = parseBalance(str);
  if (isset(val))
    val = Math.round(val/100000)  / 10;
  return val;
}
function parseUP(str) {
  var val = parseBalance(str);
  if (isset(val))
    val = Math.round(val / 10000000000000) / (100000);
  return val;
}
function validateWallet(wallet) {
	if (typeof(wallet)=="undefined")
		throw new AnyBalance.Error("Введите wallet!");
	if ((wallet.length<42) || (wallet.length>42))
		throw new AnyBalance.Error("Неверный wallet, адрес должен быть из 42 символов!");
	if (/[^a-zA-Z0-9]/.test(wallet))
		throw new AnyBalance.Error("Неверный wallet, адрес не должен содержать спец. символов!");
	if (wallet[0]!='0')
		throw new AnyBalance.Error("Неверный wallet, адрес должен начинаться с '0x' !");
}
