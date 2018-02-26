/**
API still incomplete, you can only see account info and configure workers with it:

https://hash-to-coins.com/index.php?page=api&action=getuserhashrate&api_key=_USER_API_KEY_
https://hash-to-coins.com/index.php?page=api&action=getuserworkersinfo&api_key=_USER_API_KEY_
https://hash-to-coins.com/index.php?page=api&action=getuserbalances&api_key=_USER_API_KEY_
https://hash-to-coins.com/index.php?page=api&action=getnetworksinfo&api_key=_USER_API_KEY_
https://hash-to-coins.com/index.php?page=api&action=setworkercurrency&api_key=_USER_API_KEY_&worker=_WORKER_NAME_&coin=_COIN_TAG_

The only way to automate withdrawals is set up autopayout by a threshold
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.api, 'Введите api!');
	checkEmpty(prefs.worker, 'Введите username.worker!');


	var baseurl = 'https://hash-to-coins.com/';
	
	var html = AnyBalance.requestGet(baseurl + 'index.php?page=api&action=getuserworkersinfo&api_key=' + prefs.api, g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Возможно сайт изменился или вы ввели неверный api key.');
	}

	var json = getJson(html);
	var {data} = json.getuserworkersinfo;
	var targetUser = Object.values(data).find(({ worker }) => worker === prefs.worker);
	if (typeof(targetUser)=="undefined")
		throw new AnyBalance.Error('Не могу найти ' + prefs.worker +' , Проверьте правильность ввода username.worker!');
	var {hashrate} = targetUser;

	var result = { success: true };
	getParam(hashrate, result, 'hashrate');

	getParam(prefs.worker, result, '__tariff');
	AnyBalance.setResult(result);
}