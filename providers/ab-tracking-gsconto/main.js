/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.gsconto.com';
    var authUrl = 'https://auth.users.pub'
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.login, 'Введите пароль!');

    var html = AnyBalance.requestPost(authUrl + '/ru/login', {
        username: prefs.login,
        password: prefs.password,
        dontRememberMe: 'true',
        email: ''
    }, AB.addHeaders({
        Referer: authUrl + '/ru/login',
        Origin: authUrl
    }));

    if(!html || AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    
    
    var loginErrors = {
        "invalidEmail": "Пожалуйста, укажите корректный e-mail.",
        "invalidPassword": "Пароль должен быть длиной не менее 6 символов и должен отличаться от имени и e-mail-а.",
        "passwordsMustMatch": "Пароли должны совпадать.",
        "nicknameUnavailable": "К сожалению, это имя недоступно.",
        "userAlreadyExists": "Пользователь с таким e-mail-ом уже существует. Если вы забыли свой пароль - воспользуйтесь <a href=\"/ru/password/restore\">функцией \"Восстановление пароля\"</a>.",
        "invalidCredentials": "Не правильно введены e-mail или пароль. Или пользователь с таким e-mail-ом не существует.",
        "confirmChangedEmail": "На указанный вами email отправлено письмо для подтверждения. Пожалуйста, проверьте свой почтовый ящик.",
        "failedToSendEmail": "Не удалось отправить письмо на ваш email. Попробуйте повторить еще раз позднее.",
        "emailConfirmed": "Ваш e-mail успешно подтвержден.",
        "vcodeExpired": "Проверочный код не найден или устарел. Пожалуйста, повторите процедуру сначала.",
        "userNotFound": "Пользователь с таким e-mail-ом не существует.",
        "passwordResetMailSent": "На указанный email отправлено письмо со ссылкой на страницу изменения пароля. Пожалуйста, проверьте свой почтовый ящик.",
        "passwordChanged": "Новый пароль успешно установлен. Теперь вы можете его использовать для входа."
    };
    
    var fatalErrors = {
        invalidCredentials: true
    };
    
    var lastUrl = AnyBalance.getLastUrl();
    var errorCode = AB.getParam(lastUrl, null, null, /login#!err\/([a-z0-9]+)$/i);
    if (errorCode) {
        throw new AnyBalance.Error(loginErrors[errorCode] || 'Ошибка авторизации', false, fatalErrors[errorCode] || false);
    }
    
    var userName = getParam(html, null, null, /<div[^>]+?uk-width-small-4-5[^>]+>\s*<h1[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
    
    if (!userName) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет! Сайт изменен?');
    }
    
    html = AnyBalance.requestGet(baseurl + '/oauth/usersauth/authenticate', g_headers);
    html = AnyBalance.requestPost(baseurl + '/ru/tracker/list', { offset: 0, archived: false }, {
        Referer: baseurl + 'ru/tracker/index',
        Origin: baseurl,
        'Proxy-Connection': 'keep-alive',
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest'
    });
    
    var json = AB.getJson(html);
    
    var track = getTrackByCode(json, prefs.track);
    
    if (!track) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найдено почтовое отправление с указанным кодом.');
    }
    
    var forms = ['день', 'дня', 'дней'];
    
    var result = {success: true};

    getParam(userName, result, 'user');
    getParam(track.transitTime, result, 'transitTime');
    
    getParam(track.trackCode, result, 'trackCode');
    getParam(track.dsc, result, 'dsc');
    getParam(track.destName, result, 'destName');
    
    if (AnyBalance.isAvailable('all')) {
        var points = track.originName && (track.originName != track.destName) 
            ? track.originName + ' -> ' + track.destName
            : track.destName;
        
        var event = track.lastEvent
            ? track.lastEvent.eventDate.substr(0, 16).replace('T', ' ') + '<br />' + 
                    track.lastEvent.dsc + '<br />В пути: ' + track.transitTime + 
                    ' ' + forms[getPluralForm(track.transitTime)]
            : 'Для этого трек-номера все еще нет никаких данных отслеживания';
            
        result.all = track.dsc + '(' + points + ')<br />' + event;
    }

    AnyBalance.setResult(result);
}

function getPluralForm(n) {
    return n%10==1&&n%100!=11?0:(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?1:2);
}

function getTrackByCode(array, code) {
    if (!code) {
        return array[0];
    }
    for (var i = 0; i < array.length; ++i) {
        var track = array[i];
        if (AB.endsWith(track.trackCode, code) || AB.endsWith(track.trackCode.replace(/\D+$/, ''), code)) {
            return track;
        }
    }
    return null;
}