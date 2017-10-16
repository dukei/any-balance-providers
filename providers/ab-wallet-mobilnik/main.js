/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wallet.mobilnik.kg/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'views/welcome.html', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = {
        client: 1,
        phone_number: prefs.login,
        password: prefs.password,
        model: g_headers['User-Agent']
    };

	html = AnyBalance.requestPost(
        baseurl + 'api2/authenticate/',
        JSON.stringify(params),
        AB.addHeaders({
            Referer: baseurl,
            Accept: 'application/json, text/plain, */*'
        })
    );
    var json = AB.getJson(html);
	
	if (!json.user_info) {
		if (json.message) {
            throw new AnyBalance.Error(json.message, null, /Пользователь не найден|Неправильный логин\/пароль/i.test(json.message));
        }

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true},
        fullName = json.user_info.first_name + ' ' + json.user_info.last_name + ' ' + json.user_info.patronymic;
	
	AB.getParam(json.user_info.balance[0].amount, result, 'balance', null, null, AB.parseBalance);
	AB.getParam(json.user_info.sub_code, result, 'account_num');
	AB.getParam(fullName, result, 'username');

	AnyBalance.setResult(result);
}