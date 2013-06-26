/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
'Accept-Encoding': 'gzip, deflate',
'Connection':'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://stat.naukanet.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl, 
	{
		loginSend:'',
        auth_name:prefs.login,
        auth_pass:prefs.password,
    }, g_headers); 

    if(!/logout/i.test(html))
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте правильность ввода логина и пароля!');

    var result = {success: true};
    getParam(html, result, 'fio', /Здравствуйте,\s*([\s\S]*?)!/i, replaceTagsAndSpaces, html_entity_decode);
	// Теперь пойдем посмотрим баланс
	html = AnyBalance.requestGet(baseurl + 'balance');
	// Баланс интернета
    getParam(html, result, 'balance', /Интернет[\s\S]*?>[\s\S]*?>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
