/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Бонусная программа Декатлон

Сайт оператора: http://www.decathlon.ru/RU/
Личный кабинет: http://customercard.decathlon.fr/netcard/index.jsp?language=RU&country=RU
*/

var g_headers = {
  'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'Connection':'keep-alive',
  'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11'
};

function dkt_getJson(html){
    var json = getParam(html, null, null, /onSuccess\((\{[\s\S]*?\})\)$/);
    if(!json){
        AnyBalance.trace('Can not parse server answer: ' + html);
        throw new AnyBalance.Error('Неожиданный ответ сервера. Сайт изменен?');
    }

    json = getJson(json);
    if(!json.success){
        AnyBalance.trace('Server returned error: ' + html);
        var msg = [];
        for(var i=0; i<json.errors.length; ++i){
            var error = json.errors[i];
            msg.push(error.errorMessage ? error.errorMessage + '(' + error.code + ')' : error.code);
        }
        throw new AnyBalance.Error('Сервер вернул ошибку: ' + msg.join('\n'));
    }

    return json;
}

function createParams(params){
    var str = '';
    for(var param in params){
        str += str ? '&' : '?';
        str += encodeURIComponent(param);
        str += '=';
        str += encodeURIComponent(params[param]);
    }
    return str;
}

//http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
function validateEmail(email) { 
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
} 

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Введите e-mail для входа в личный кабинет Декатлон');
    checkEmpty(validateEmail(prefs.login), 'Вы ввели некорректный e-mail. Для логина требуется корректный e-mail.');
    checkEmpty(prefs.password, 'Введите пароль для входа в личный кабинет Декатлон');

    var root = 'https://back.mydecathlon.com/mydkt-server-mvc/ajax/';
    var pathAuth = 'private/authentification/connexion';
    var pathBalance = 'private/synthesePersonne/getInfoPersonne';

    var mdp = HUd(prefs.login, prefs.password);

    var html = AnyBalance.requestGet(root + pathAuth + createParams({
    			ppays: 'RU',
    			codeAppli: 'NetCardV2',
    			langue: 'RU',
    			mdp: mdp,
    			email: prefs.login,
    			__preventCache__: new Date().getTime(),
    			callback: '__gwt_jsonp__.P1.onSuccess'
    }));

    var json = dkt_getJson(html);
    if(json.data.codeRetour == "404")
        throw new AnyBalance.Error('Неверный E-Mail или пароль', null, true);

    if(json.data.codeRetour != "200"){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var token = json.data.token;
    var personneId = 66600000000 + Math.floor(Math.random() * 100000000);

    var html = AnyBalance.requestGet(root + pathBalance + createParams({
    			ppays: 'RU',
    			personneId: personneId,
    			esdljkdl: token,
    			__preventCache__: new Date().getTime(),
    			callback: '__gwt_jsonp__.P2.onSuccess'
    }));

    json = dkt_getJson(html);

    var result = {success: true};

    getParam(json.data.soldePoint.numeroCarte, result, '__tariff');
    getParam(json.data.soldePoint.solde, result, 'balance');
    getParam(json.data.soldePoint.nbPointsPourCheque, result, 'left2kupon');
    getParam(json.data.soldePoint.dateSolde, result, 'lastchange', null, null, parseDateISO);
    getParam(json.data.donneesPersonne.prenom + ' ' + json.data.donneesPersonne.nom, result, 'fio');
    
    AnyBalance.setResult(result);
}

