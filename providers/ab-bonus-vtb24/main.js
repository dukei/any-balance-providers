/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'Content-Type':'application/json',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://new.multibonus.ru/frontend-facade/api/v1/';
	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.restoreCookies();
        var html = AnyBalance.requestGet(baseurl + 'Buy/GetBalance', g_headers);
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
        prefs.login=prefs.login.replace(/[^\d]*/g,'').substr(-10);
        if (!/^\d{10}$/.test(prefs.login)) throw new AnyBalance.Error('Неверный номер телефона');
  if (!html||AnyBalance.getLastStatusCode()==401){
	AnyBalance.trace('Нужно логиниться');
	var html = AnyBalance.requestPost(baseurl + 'Token/GetToken', JSON.stringify({Password: prefs.password,UserPhone: '7'+prefs.login}),g_headers,{httpMethod:'PUT'});
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace('getLastStatusCode:'+AnyBalance.getLastStatusCode());
		AnyBalance.trace('html:\n'+html);
                clearAllCookies();
		AnyBalance.saveCookies();
		AnyBalance.saveData();
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var json=getJson(html);
	if (!json.Success) {
		AnyBalance.trace('html:\n'+html);
		throw new AnyBalance.Error('Не удалось войти в кабинет. Возможно изменения в API.');
		}
        var html = AnyBalance.requestGet(baseurl + 'Buy/GetBalance', g_headers);
  }

	var result = {success: true};
        json=getJson(html);
	getParam(json.BalanceTotal, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	var fio=AnyBalance.getData('fio_'+prefs.login);
	if (!fio){
	   try{
        	var html = AnyBalance.requestGet(baseurl + 'ClientProfile/GetStartProfile' ,g_headers);
	        json=getJson(html);
	        fio=capitalFirstLetters(json.Profile.ClientProfile.FirstName+' '+json.Profile.ClientProfile.MiddleName+' '+json.Profile.ClientProfile.LastName);
	        if (fio) AnyBalance.setData('fio_'+prefs.login,fio);
	   }catch(e){
	   	AnyBalance.trace(e.message)}
	}
	getParam(fio , result, '__tariff');
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	AnyBalance.setResult(result);
}