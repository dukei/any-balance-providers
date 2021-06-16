/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
'accept':'application/json, text/javascript, */*; q=0.01',
'x-requested-with':'XMLHttpRequest',
'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.190 Safari/537.36',
'content-type':'application/json; charset=UTF-8',
'origin':'https://www.letu.ru',
'referer':'https://www.letu.ru/login'
}

function main () {
    
    var prefs = AnyBalance.getPreferences ();
    var loc=prefs.loc||'RU';
    var baseurl = 'https://www.letu.'+loc+'/';
    AnyBalance.restoreCookies();
    var html = AnyBalance.requestGet(baseurl+'rest/model/atg/userprofiling/ClientActor/extendedProfileInfo?pushSite=storeMobile'+loc+'&_='+(new Date().getTime()));
    var json=getJson(html);
    if (!json.profile.lastName)
{
    AnyBalance.trace('Нужно логиниться');
    checkEmpty (prefs.login, 'Введите e-mail');
    checkEmpty (prefs.password, 'Выберите пароль');
    AnyBalance.setDefaultCharset('utf-8'); 
    //var html = AnyBalance.requestGet(baseurl+'login/');
    var html = AnyBalance.requestGet(baseurl+'rest/model/atg/rest/SessionConfirmationActor/getSessionConfirmationNumber');
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    var setItem=getParam(html,/sessionConfirmationNumber":\s?(-?\d*)/i);
    if (!setItem) throw new AnyBalance.Error ('Не удалось найти параметры авторизации. Возможно сайт изменен.');
    var html = AnyBalance.requestPost(baseurl+'rest/model/atg/userprofiling/ProfileActor/login', JSON.stringify({
	login: prefs.login,
	password: prefs.password,
	pushSite: 'storeMobile'+loc,
	_dynSessConf: setItem
    	}),g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
    var result = {success: true};
    if (/<title>Error<\/title>/i.test(html)) {
    	var err=getElement(html,/<body>/,replaceTagsAndSpaces);
    	if (err) throw new AnyBalance.Error (err,false,true);
        throw new AnyBalance.Error ('Не удалось авторизоваться. Возможно сайт изменен.',false,true);
    }
    var json=getJson(html);
    if (json.formExceptions) throw new AnyBalance.Error (json.formExceptions[0].localizedMessage,false,true);
    var html = AnyBalance.requestGet(baseurl+'rest/model/atg/userprofiling/ClientActor/extendedProfileInfo?pushSite=storeMobile'+loc+'&_='+(new Date().getTime()));
}

    var json=getJson(html);

    var result = {success: true};
    result.balance=json.profile.cardBalance;
    result.discount=json.profile.cardDiscount;
    result.__tariff=json.profile.cardTypeName;

    getParam(json.profile.cardNumber+'', result, 'number', null,[/(\d{4})(\d{4})(\d*)/i,'$1-$2-$3']);
    getParam(html, result, 'balance', /Баланс\s*карты:^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.saveCookies();
	AnyBalance.saveData();

   AnyBalance.setResult (result);
}