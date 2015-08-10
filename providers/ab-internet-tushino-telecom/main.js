/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://cabinet.tushino.com/";

    var html = AnyBalance.requestGet(baseurl + 'login');

    var params = createFormParams(html, function(params, str, name, value) {
        if (name == 'user[login]') 
            return prefs.login;
        else if (name == 'user[password]')
            return prefs.password;

        return value;
    });

	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login'})); 

    if(!/new HupoApp/i.test(html)){
        var error = getParam(html, null, null, /<div class="error_container">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var json = getParam(html, null, null, /new HupoApp\(([^]+?)\.data,/i, null, getJson);
    if(!json)
        throw new AnyBalance.Error('Не найдены данные. Сайт изменен?');

    var result = {success: true};

    //getParam(html, result, 'id', /ID:[\s\S]{1,50}<td class="s_r">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(json.data.person.vc_name, result, 'fio', null);
    //getParam(html, result, '__tariff', /Текущий тариф:[\s\S]{1,50}<td class="s_r">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(json.data.personal_accounts[0].n_sum_bal, result, 'balance', null);
    getParam(json.data.servs[0].n_good_sum, result, 'abon', null);
    //getParam(html, result, 'status', /Состояние:[\s\S]{1,50}<td class="s_r">([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}