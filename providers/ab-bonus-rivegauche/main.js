/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'Origin'	:'https://shop.rivegauche.ru/my-account',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36',
	'Client-Version':'1.0.2',
	'Content-Type':'application/json',
	'Sec-Fetch-Site':'same-origin',
	'Sec-Fetch-Mode':'cors',
	'Sec-Fetch-Dest':'empty'
};
	var baseurl = 'https://shop.rivegauche.ru/rg/v1/newRG/customers/';

function main(){
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences();
	var token=AnyBalance.getData('token'+prefs.login);
        AnyBalance.restoreCookies();
	if (token) {
	   AnyBalance.trace('Найден старый токен:\n'+token);
	   g_headers.Authorization='Bearer '+token;

           var html=AnyBalance.requestGet(baseurl+'current/statistic',g_headers);
           AnyBalance.trace('===Результат current/statistic:\n'+html);
           if (/errors/i.test(html)){
              token='';
              AnyBalance.trace(html);
              if (/token/i.test(html)) {
		AnyBalance.trace('Токен устарел.');
		var refreshToken=AnyBalance.getData('refreshToken'+prefs.login);
		if  (refreshToken) {
			AnyBalance.trace('Пробуем освежить токен');
			try{
                        	token=refresh_token(prefs,refreshToken);
                        }catch(e){
                        	AnyBalance.trace(e.message);
                        }
                }
              }
	   }
	}
	if (!token) token=loginByPassword(prefs);
	if (!token) {
		AnyBalance.setData('token'+prefs.login,'');
		AnyBalance.setData('refreshToken'+prefs.login,'');
		clearAllCookies();
		AnyBalance.saveCookies();
		AnyBalance.saveData();
		throw new AnyBalnce.Error('Авторизация не удалась. Возможно изменился API',false,true);
	}
	var result = {success: true};

	var html=AnyBalance.requestGet(baseurl+'current/discount-cards',g_headers);
	AnyBalance.trace('===Результат current/discount-cards:\n'+html);
	json=getJson(html).defaultCard;
	if (json){
		
		result.__tariff=json.type.name;
		result.balance=parseBalance(JSON.stringify(result.loyPointBalances)||0);
		result.fullCardNumber=json.fullCardNumber.replace(/(\d{4})(\d{3})(\d{2})(\d*)/,'$1 $2-$3-$4');
	}

	var html=AnyBalance.requestGet(baseurl+'current/statistic',g_headers);
	AnyBalance.trace('===Результат current/statistic:\n'+html);
	json=getJson(html);
	result.orders=json.processingOrdersCount+'/'+json.ordersTotalCount;
	result.favoritesProductsCount=json.favoritesProductsCount;
	result.awaitingProductsCount=json.awaitingProductsCount;
        AnyBalance.saveData();
	AnyBalance.setResult(result);
}

function loginByPassword(prefs){
	g_headers.Authorization='';
	AnyBalance.trace('Нужно логиниться');
	checkEmpty(prefs.login, 'Введите номер карты или email!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var html = AnyBalance.requestPost(baseurl+'oauth2/acquire-token',JSON.stringify({
		"username": prefs.login,
		"password": prefs.password,
		"rememberMe": true,
		"reCaptchaResponse": solveRecaptcha("Пожалуйста, докажите, что Вы не робот",'https://shop.rivegauche.ru/my-account', '6Lc1JKUZAAAAAMk0jBpSvm_WFs9hi9bgsisdcYBE')	
		}), g_headers);

	AnyBalance.trace('===Результат oauth2/acquire-token:\n'+html);
	var json=getJson(html);
	if (json.errors) throw new AnyBalance.Error(json.errors[0].message,false,/password|block/i.test(JSON.stringify(json)));
	if (!json.tokenPair) throw new AnyBalance.Error('Ошибка авторизации. Пара токенов не найдена');
	var token=json.tokenPair.accessToken.value;
	var refreshToken=json.tokenPair.refreshToken.value;
	AnyBalance.setData('token'+prefs.login,token);
        AnyBalance.setData('refreshToken'+prefs.login,refreshToken);
        AnyBalance.saveCookies();
        AnyBalance.saveData();
        g_headers.Authorization='Bearer '+token
        return token;
}
function refresh_token(prefs,refreshToken){
	g_headers.Authorization='';
	var html = AnyBalance.requestPost(baseurl+'oauth2/exchange-token',JSON.stringify({refreshToken: refreshToken}), g_headers);
        AnyBalance.trace('===Результат oauth2/exchange-token:\n'+html);
	var json=getJson(html);
	if (json.errors) throw new AnyBalance.Error(json.errors[0].message,false,/password|block/i.test(JSON.stringify(json)));
	if (!json.tokenPair) throw new AnyBalance.Error('Ошибка авторизации. Пара токенов не найдена');
	var token=json.tokenPair.accessToken.value;
	var refreshToken=json.tokenPair.refreshToken.value;
	AnyBalance.setData('token'+prefs.login,token);
        AnyBalance.setData('refreshToken'+prefs.login,refreshToken);
        AnyBalance.saveCookies();
        AnyBalance.saveData();
        g_headers.Authorization='Bearer '+token
        return token;
}
