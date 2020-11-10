/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/json,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.vladlink.ru/';                                   
	var baseurl2 = 'https://api.vladlink.ru/';                                   
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var json = AnyBalance.requestPost(baseurl2 + 'v1/auth/subscribers', {'login': prefs.login,'password': prefs.password}, addHeaders({Referer: baseurl + 'login?back=v1%2Fauth%2Fsubscribers'}));
	obj = JSON.parse(json);

	if(obj.status > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера!');
	}                         
                             
	json = AnyBalance.requestGet(baseurl2 + 'v1/public/users/my?select=id,ulogin,full_name,email,bill,block,cblock,tariff,tariff_next,tariff_current,u_address,is_juridical,is_sms,city_id,skidko,balls', 
                 addHeaders({Referer: baseurl + 'login', Authorization: obj.data.auth_token}));
	obj = JSON.parse(json);

	var result = {success: true, balance: obj.data[0].bill, bonus: obj.data[0].balls, acc_num : obj.data[0].id, status: obj.data[0].block};
	
	AnyBalance.setResult(result);
}
