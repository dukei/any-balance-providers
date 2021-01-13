/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Language': 'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'content-type': 'application/x-www-form-urlencoded',
	"X-Requested-With":"XMLHttpRequest"
};

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://4pda.ru/forum/index.php?';

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
        AnyBalance.restoreCookies();
        var html = AnyBalance.requestGet(baseurl+'act=boardrules',g_headers);
if (!/action=logout/.test(html)){
    html = AnyBalance.requestGet(baseurl + "act=auth",g_headers);
    capatcha_time=getParam(html, null, null, /captcha-time" value="([^"]*)/i);
    capatcha_sign=getParam(html, null, null, /captcha-sig" value="([^"]*)/i);
    capatcha=getParam(html, null, null, /captcha-sig[\S\s]*?src="([^"]*)/i);
        var img=AnyBalance.requestGet('https:'+capatcha);
	var code= AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", img, {
		inputType: 'number',
		minLength: 4,
		maxLength: 4,
		time: 300000
	});
      html=AnyBalance.requestPost(baseurl+'act=auth', ({
      	'return': baseurl+'act=boardrules',
      	login: prefs.login,
      	password: prefs.password,
      	remember: 1,
      	'captcha-time': capatcha_time,
      	'captcha-sig': capatcha_sign,
      	captcha: code}) ,g_headers);
      if (/Введено неверное число с картинки\. Попробуйте ещё раз\./.test(html)) throw new AnyBalance.Error('Введено неверное число с картинки. Попробуйте ещё раз.');
      if (!/action=logout/.test(html)) throw new AnyBalance.Error('Не удалось войти на 4pda. Сайт изменен?');
      AnyBalance.saveCookies();
      AnyBalance.saveData();

}
	//4pda.ru/forum/index.php?showuser=1729973">dimapplk
      var userId=getParam(html, null, null, /index\.php\?showuser=(\d*)"/i);
      if (!userId) throw new AnyBalance.Error('Не удалось получить идентификатор пользователя. Сайт изменен?');
      var result = {success: true};
      result.qms=getParam(html,null,null,/act=qms[\s\S]*?Сообщения \((\d*?)\)/i,null,parseBalance)||0;
      result.mentions=getParam(html,null,null,/act=mentions"\>Упоминания \((\d*?)\)/i,null,parseBalance)||0;
      result.fav=getParam(html,null,null,/act=fav[\s\S]*?Избранное \((\d*?)\)/i,null,parseBalance)||0;
      if (AnyBalance.isAvailable('posts','reputation','topics')){
      	html=AnyBalance.requestGet(baseurl+'showuser='+userId,g_headers);
        getParam(html,result,'reputation',/data-member-rep="\d*?">(\d*?)</i,null,parseBalance);
        getParam(html,result,'posts',/Найти сообщения пользователя" rel="nofollow">(\d*?)</i,null,parseBalance);
        getParam(html,result,'topics',/title="Найти темы пользователя" rel="nofollow">(\d*?)</i,null,parseBalance);
        getParam(html,result,'__tariff',/class="photo"[\s\S]*?style[\s\S]*?>([\S\s]*?)</i,null,null);
      }






      AnyBalance.setResult(result);
}