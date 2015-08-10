/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://stat.inetcom.ru/cabinet/";
    
    var html = '';
    for (i=0; i<3; i++) {  // try several times with different session ID

		sessID = Math.random().toString().substr(2);
        if (sessID.substr(0,1) == '0') {
	    sessID = '1'+sessID;
        }

        html = AnyBalance.requestPost(baseurl + 'index.php', {
            ICSess:   sessID,
            url:      '',
            login:    prefs.login,
            password: prefs.password
        });
    
        //AnyBalance.trace('got  ' + html);
    
        var ps = html.lastIndexOf('Неверный логин или пароль');
        if (ps >= 0) {
            if (i < 2) {
                continue;
            } else {
                throw new AnyBalance.Error('Неверный логин или пароль.');
            }
        } else {
            break;
        }
    }

    var p1 = html.lastIndexOf('Номер договора');
    if (p1 < 0)
        throw new AnyBalance.Error('Не удаётся найти данные. Сайт изменен?');

    html = html.substr(p1);
 
    var result = {success: true};

    //getParam(html, result, 'id', /Номер договора[^>]*>(.*?)<\/b/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userName', /Здравствуйте, [^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Состояние Вашего лицевого счета[^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, parseBalance);
    //getParam(html, result, 'abplate', /Абонентская плата за расчетный период[^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /Входящий трафик в расчетном периоде[^>]*>(.*?)<\/span>/i,  replaceTagsAndSpaces, parseBalance);
    
    var ps = "";
    if(matches = html.match(/Расчетный период c[^>]*>(.*?)</)){
        ps = matches[1];
    }
    var pe = "";
    if(matches = html.match(/span> по [^>]*>(.*?)</)) {
        pe = matches[1];
    }
    if (ps != "" && pe != "") {
        period = ps+' по '+pe;
        result['period'] = period;
    }

    AnyBalance.setResult(result);
}


