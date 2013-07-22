/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет провайдера Инетком (Москва).

https://stat.inetcom.ru/cabinet

*/

function main(){

    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences();
   
    if(!prefs.login)
	    throw new AnyBalance.Error('Вы не ввели логин');
    if(!prefs.password)
	    throw new AnyBalance.Error('Вы не ввели пароль');

    var baseurl = "https://stat.inetcom.ru/cabinet/";

    sessID = Math.random().toString().substr(2);
    var html = AnyBalance.requestPost(baseurl + 'index.php', {
        ICSess: sessID,
        url:    '',
        login: prefs.login,
        password: prefs.password
    });

    var p1 = html.lastIndexOf('<div id="infoscroll">');
    if (p1 < 0)
        throw new AnyBalance.Error('Неверный логин или пароль.');

    html = html.substr(p1 + '<div id="infoscroll">'.length);

    var p2 = html.indexOf('</div>');
    if (p2 < 0)
        throw new AnyBalance.Error('Не удаётся найти данные. Сайт изменен?');

    html = html.substr(0, p2);

    var matches;

    var userName = "";
    if(matches = html.match(/<p>Здравствуйте, <span class="green">(.*?)<\/span>/)){
        userName = matches[1];
        AnyBalance.trace('got userName ' + userName);
    }

    var balance = "";
    if(matches = html.match(/<p>Состояние Вашего лицевого счета: <span class="green">(.*?)<\/span>/)){
        balance = matches[1];
        AnyBalance.trace('got balance ' + balance);
    }
       
    /*var abplata = "";
    if(matches = html.match(/<p>Абонентская плата за расчетный период: <span class="blue">(.*?)<\/span>/)){
        abplata = matches[1];
        AnyBalance.trace('got price per period ' + abplata);
    }*/

    var traffic = "";
    if(matches = html.match(/<p>Входящий трафик в расчетном периоде: <span class="green">(.*?)<\/span>/)){
        traffic = matches[1];
        AnyBalance.trace('got traffic ' + traffic);
    }

    var result = {success: true,
                  userName: userName,
                  balance: parseFloat(balance), 
                  traffic: parseFloat(traffic)};

    AnyBalance.setResult(result);
}
