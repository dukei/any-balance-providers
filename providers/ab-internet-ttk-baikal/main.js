/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/


var g_headers = {
  'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection':       'keep-alive',
  'User-Agent':       'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36',
};
var g_baseUrls = {
	all: 'https://stat.baikal-ttk.ru/',
	yak: 'https://188.244.184.44/',
}

function main(){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	processCabinet(g_baseUrls[(prefs.region || 'all')], prefs)
}

function processCabinet(baseurl, prefs){
    var html        = AnyBalance.requestGet(baseurl, g_headers),
        login_name  = getParam(html, null, null, /(login_remote\w+)/i),
        pass_name   = getParam(html, null, null, /(password_remote\w+)/i);

    if(!login_name || !pass_name) {
      AnyBalance.trace(html);
      throw new AnyBalance.Error('Не удалось найти форму входа в личный кабинет!');
    }

    var params = {
      roiiur:   0,
		  soiiur:   true,
		  redirect: ''
    };
	
    params[login_name]  = prefs.login;
    params[pass_name]   = prefs.password;

    params['action.remote_login.0kiiur.x'] = 23;
    params['action.remote_login.0kiiur.y'] = 6;
	
    html = AnyBalance.requestPost(baseurl + 'login', params, g_headers);

    if(!/выход/i.test(html)) {
      var error = getParam(html, null, null, /<font [^>]*class="error"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces);
      if(error) {
        throw new AnyBalance.Error(error, null, /Введенная информация неверна/i.test(error));
      }

      AnyBalance.trace(html);
      throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменён?");
    }

	
    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'webUserLogin', g_headers);

    if(prefs.acc) {
      var params      = {},
          re          = new RegExp('<option[^>]+value="([^"]*)[^>]*>\\d+' + prefs.acc, 'i'),
          value       = getParam(html, null, null, re),
          action_name = getParam(html, null, null, /Лицевой счет[\s\S]*?submitformbyname(?:[^']*'){3}([^']*)/i),
          option_name = getParam(html, null, null, /<select[^>]+name="([^"]*)/i),
          form_name   = getParam(html, null, null, /ArrayListTranslator[\s\S]*?<input[^>]+name="([^"]*)/i),
          form_value  = getParam(html, null, null, /ArrayListTranslator[\s\S]*?<input[^>]+value="([^"]*)/i);

      if(!value) {
        throw new AnyBalance.Error("Не удалось найти счёт с цифрами " + prefs.acc);
      }

      params[action_name] = true;
      params[option_name] = value;
      params[form_name]   = form_value;

      html = AnyBalance.requestPost(baseurl + 'webUserLogin', params, g_headers);
    }

    getParam(html, result, 'userName',  /<!-- Наименование клиента -->[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet',  /Договор (\d+) от/i,                                               replaceTagsAndSpaces);
    getParam(html, result, 'balance',   /Итого на [\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i,                    [replaceTagsAndSpaces, /долг|задолженность/i, '-'], parseBalance);

    //getParam(html, result, 'status', /Состояние:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var href = getParam(html, null, null, /<a href=["']([^'"]+)["'][^>]*>сменить тариф Интернет<\/a>/i);
    if(!href){
      AnyBalance.trace("Не удалось найти ссылку на информацию по тарифу.");
    } else {
      html = AnyBalance.requestGet(baseurl + href, g_headers);
      getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    }
	
    AnyBalance.setResult(result);
}