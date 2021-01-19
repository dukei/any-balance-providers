/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
	accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	referer: 'https://issaold.beltelecom.by/main.html',
        dnt: 1,
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'upgrade-insecure-requests': 1
};

function main(){
	var baseurl='https://issaold.beltelecom.by/';
	try{
         AnyBalance.restoreCookies();
        }catch(e){
	 clearAllCookies();
	 AnyBalance.saveCookies();
	 AnyBalance.saveData();
	}
	var html=AnyBalance.requestGet(baseurl+'main.html',g_headers);
        var prefs = AnyBalance.getPreferences();
	if (!/logout/i.test(html)){
		if (/oper_user/i.test(html)){
			var img=AnyBalance.requestGet(baseurl+'data/capcha/secpic.php',g_headers);
		   var code= AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {
			inputType: 'number',
			minLength: 4,
			maxLength: 4,
			time: 300000
		   });
        	   var html=AnyBalance.requestPost(baseurl+'main.html',{
        		redirect: '/main.html',
                	oper_user: prefs.login,
                	passwd: prefs.password,
                	cap_field: code
        		},g_headers);
        	var html=AnyBalance.requestGet(baseurl+'main.html',g_headers);
		}
	}
	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти. Сайт изменен?');
		}
	var result = {success: true};
    
    getParam(html, result, 'balance',/баланс:([\s\S]*?)р/i,replaceTagsAndSpaces,parseBalance);
    getParam(html, result, 'agreement',/Договор ([\s\S]*?)</i,replaceTagsAndSpaces,parseBalance);
    getParam(html, result, 'username',/ФИО \/ Компания: ([\s\S]*?)</i,replaceTagsAndSpaces,null);
    getParam(html, result, 'status',/Статус блокировки([\s\S]*?)<a href/i,replaceTagsAndSpaces,null);
    getParam(html, result, 'login',/Логин ([\s\S]*?)</i,replaceTagsAndSpaces,parseBalance);
    getParam(html, result, '__tariff',/Тарифный план на услуги([\s\S]*?)<\/tr/i,replaceTagsAndSpaces,null);
    AnyBalance.saveCookies();
    AnyBalance.saveData();
    AnyBalance.setResult(result);

}